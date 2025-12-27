import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { index } from "./pineconeClient";

dotenv.config();

const KNOWLEDGE_NAMESPACE = "knowledge";
const EMBEDDING_MODEL = "models/text-embedding-004";
const DEFAULT_TOP_K = 10;

const MAX_CHUNK_CHARS = 900;
const MIN_CHUNK_CHARS = 240;
const CHUNK_OVERLAP_CHARS = 160;
const UPSERT_BATCH_SIZE = 50;
const MIN_QUERY_TERM_LENGTH = 3;
const QUERY_VARIANT_LIMIT = 3;
const MIN_SEARCH_TOP_K = 8;
const LEXICAL_BOOST_WEIGHT = 0.15;

export type SourceCitation = {
  id: string;
  sourceId?: string;
  title?: string;
  url?: string;
  snippet: string;
  score?: number;
  sourceType?: string;
  chunkIndex?: number;
};

type PineconeMatch = {
  id: string;
  score?: number;
  metadata?: Record<string, any>;
};

const getEmbeddingModel = () => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  return genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
};

const normalizeText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const splitLongSegment = (segment: string, maxChars: number) => {
  const parts: string[] = [];
  for (let i = 0; i < segment.length; i += maxChars) {
    parts.push(segment.slice(i, i + maxChars));
  }
  return parts;
};

const sentenceSplit = (segment: string) =>
  segment.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/g);

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "about",
  "what",
  "which",
  "that",
  "this",
  "from",
  "have",
  "has",
  "had",
  "are",
  "were",
  "was",
  "who",
  "how",
  "why",
  "when",
  "where",
  "your",
  "you",
  "his",
  "her",
  "their",
  "them",
  "they",
  "recent",
  "recently",
  "latest",
  "new",
]);

const extractQueryTerms = (query: string) => {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .filter(
      (token) => token.length >= MIN_QUERY_TERM_LENGTH && !STOPWORDS.has(token),
    );
  return Array.from(new Set(tokens));
};

const computeLexicalBoost = (terms: string[], text: string) => {
  if (!terms.length || !text) return 0;
  const normalized = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (normalized.includes(term)) {
      hits += 1;
    }
  }
  return (hits / terms.length) * LEXICAL_BOOST_WEIGHT;
};

const buildQueryVariants = (query: string) => {
  const variants = [query.trim()];
  const lower = query.toLowerCase();

  if (/(project|projects|portfolio|built|work)/.test(lower)) {
    variants.push("recent projects portfolio notable projects");
  }

  if (/(experience|worked|work history)/.test(lower)) {
    variants.push("work experience projects");
  }

  return Array.from(new Set(variants.filter(Boolean))).slice(
    0,
    QUERY_VARIANT_LIMIT,
  );
};

export const chunkText = (
  text: string,
  options?: { maxChars?: number; minChars?: number; overlapChars?: number },
) => {
  const maxChars = options?.maxChars ?? MAX_CHUNK_CHARS;
  const minChars = options?.minChars ?? MIN_CHUNK_CHARS;
  const overlapChars = options?.overlapChars ?? CHUNK_OVERLAP_CHARS;

  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      segments.push(paragraph);
      continue;
    }
    const sentences = sentenceSplit(paragraph).map((s) => s.trim());
    for (const sentence of sentences) {
      if (!sentence) continue;
      if (sentence.length <= maxChars) {
        segments.push(sentence);
      } else {
        segments.push(...splitLongSegment(sentence, maxChars));
      }
    }
  }

  const chunks: string[] = [];
  let buffer = "";

  const pushChunk = (chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    if (chunks.length === 0 || trimmed.length >= minChars) {
      chunks.push(trimmed);
      return;
    }
    chunks[chunks.length - 1] += `\n\n${trimmed}`;
  };

  for (const segment of segments) {
    const separator = buffer ? "\n\n" : "";
    if (buffer.length + separator.length + segment.length <= maxChars) {
      buffer += `${separator}${segment}`;
      continue;
    }

    pushChunk(buffer);
    if (overlapChars > 0 && buffer.length > overlapChars) {
      buffer = buffer.slice(-overlapChars);
      buffer = buffer.trim();
    } else {
      buffer = "";
    }

    if (buffer) {
      buffer += `\n\n${segment}`;
    } else {
      buffer = segment;
    }
  }

  pushChunk(buffer);

  return chunks;
};

const buildVectorId = (sourceId: string, chunkIndex: number) =>
  `${sourceId}::${chunkIndex}`;

export const ingestKnowledgeSource = async (options: {
  sourceId: string;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl?: string;
  replaceExisting?: boolean;
}) => {
  const content = options.content.trim();
  const chunks = chunkText(content);
  if (chunks.length === 0) {
    if (options.replaceExisting) {
      await deleteKnowledgeSourceVectors(options.sourceId);
    }
    return { chunkCount: 0 };
  }

  const model = getEmbeddingModel();
  const vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }> = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const embeddingResponse = await model.embedContent(chunk);
    const embedding = embeddingResponse.embedding.values;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response format.");
    }

    vectors.push({
      id: buildVectorId(options.sourceId, index),
      values: embedding,
      metadata: {
        text: chunk,
        sourceId: options.sourceId,
        title: options.title,
        sourceType: options.sourceType,
        sourceUrl: options.sourceUrl,
        chunkIndex: index,
      },
    });
  }

  if (options.replaceExisting) {
    await deleteKnowledgeSourceVectors(options.sourceId);
  }

  for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
    const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
    await index.namespace(KNOWLEDGE_NAMESPACE).upsert(batch);
  }

  return { chunkCount: chunks.length };
};

export const deleteKnowledgeSourceVectors = async (sourceId: string) => {
  try {
    await index.namespace(KNOWLEDGE_NAMESPACE).deleteMany({ sourceId });
  } catch (error: any) {
    const status = error?.status || error?.statusCode || error?.cause?.status;
    if (status === 404 || error?.name === "PineconeNotFoundError") {
      return;
    }
    throw error;
  }
};

export const retrieveKnowledgeChunks = async (
  query: string,
  topK: number = DEFAULT_TOP_K,
): Promise<SourceCitation[]> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  const model = getEmbeddingModel();
  const queryVariants = buildQueryVariants(query);
  const searchTopK = Math.max(topK * 2, MIN_SEARCH_TOP_K);
  const matchesMap = new Map<string, PineconeMatch>();

  for (const variant of queryVariants) {
    const embeddingResponse = await model.embedContent(variant);
    const queryEmbedding = embeddingResponse.embedding.values;

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      continue;
    }

    const response = await index.namespace(KNOWLEDGE_NAMESPACE).query({
      vector: queryEmbedding,
      topK: searchTopK,
      includeMetadata: true,
    });

    const matches = (response.matches ?? []) as PineconeMatch[];
    for (const match of matches) {
      const existing = matchesMap.get(match.id);
      const matchScore = match.score ?? 0;
      const existingScore = existing?.score ?? -1;
      if (!existing || matchScore > existingScore) {
        matchesMap.set(match.id, match);
      }
    }
  }

  const terms = extractQueryTerms(query);
  const scoredMatches = Array.from(matchesMap.values())
    .filter(
      (match) =>
        typeof match.metadata?.text === "string" &&
        typeof match.metadata?.title === "string" &&
        match.metadata?.title?.trim() &&
        typeof match.metadata?.sourceId === "string" &&
        match.metadata?.sourceId?.trim(),
    )
    .map((match) => {
      const title = match.metadata?.title as string;
      const snippet = match.metadata?.text as string;
      const sourceType = match.metadata?.sourceType as string | undefined;
      const combined = `${title}\n${sourceType || ""}\n${snippet}`;
      const boost = computeLexicalBoost(terms, combined);
      return { match, boostedScore: (match.score ?? 0) + boost };
    })
    .sort((a, b) => b.boostedScore - a.boostedScore)
    .slice(0, topK);

  return scoredMatches.map(({ match }) => ({
    id: match.id,
    sourceId: match.metadata?.sourceId,
    title: match.metadata?.title,
    url: match.metadata?.sourceUrl,
    snippet: match.metadata?.text,
    score: match.score,
    sourceType: match.metadata?.sourceType,
    chunkIndex: match.metadata?.chunkIndex,
  }));
};
