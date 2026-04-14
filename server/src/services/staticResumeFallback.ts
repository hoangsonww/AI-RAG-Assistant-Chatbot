import fs from "fs";
import path from "path";
import { chunkText, SourceCitation } from "./knowledgeBase";

type StaticResumeManifestSource = {
  externalId?: string;
  title?: string;
  sourceType?: string;
  sourceUrl?: string;
  file?: string;
  content?: string;
};

type StaticResumeManifest = {
  sources?: StaticResumeManifestSource[];
};

type RankedStaticChunk = SourceCitation & {
  order: number;
  searchText: string;
  rank: number;
};

const SERVER_ROOT = path.resolve(__dirname, "../..");
const STATIC_RESUME_MANIFEST_PATH = path.join(
  SERVER_ROOT,
  "knowledge",
  "manifest.json",
);
const FALLBACK_SOURCE_PREFIX = "static-resume";
const FALLBACK_CHUNK_OPTIONS = {
  maxChars: 700,
  minChars: 180,
  overlapChars: 80,
};
const MIN_QUERY_TERM_LENGTH = 3;
const DEFAULT_FALLBACK_TOP_K = 10;

const FALLBACK_STOPWORDS = new Set([
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

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
};

const extractQueryTerms = (query: string): string[] => {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .filter(
      (token) =>
        token.length >= MIN_QUERY_TERM_LENGTH && !FALLBACK_STOPWORDS.has(token),
    );
  return Array.from(new Set(tokens));
};

const scoreChunk = (terms: string[], text: string): number => {
  if (terms.length === 0) return 0;
  const normalized = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (normalized.includes(term)) {
      hits += 1;
    }
  }
  return hits / terms.length;
};

const readStaticResumeManifestSources = async (): Promise<
  StaticResumeManifestSource[]
> => {
  const raw = await fs.promises.readFile(STATIC_RESUME_MANIFEST_PATH, "utf8");
  const parsed = JSON.parse(raw) as StaticResumeManifest;
  if (!Array.isArray(parsed.sources)) {
    throw new Error("Static resume manifest must contain a sources array.");
  }
  return parsed.sources;
};

const readSourceContent = async (
  source: StaticResumeManifestSource,
): Promise<string> => {
  const inlineContent =
    typeof source.content === "string" ? source.content.trim() : "";
  if (inlineContent) {
    return inlineContent;
  }

  const sourceFile = typeof source.file === "string" ? source.file.trim() : "";
  if (!sourceFile) {
    throw new Error("Static resume source is missing both content and file.");
  }

  const resolvedPath = path.resolve(SERVER_ROOT, sourceFile);
  const fileContent = await fs.promises.readFile(resolvedPath, "utf8");
  return fileContent.trim();
};

const buildFallbackChunks = async (): Promise<RankedStaticChunk[]> => {
  const manifestSources = await readStaticResumeManifestSources();
  const chunks: RankedStaticChunk[] = [];
  let order = 0;

  for (
    let sourceIndex = 0;
    sourceIndex < manifestSources.length;
    sourceIndex++
  ) {
    const source = manifestSources[sourceIndex];
    const title =
      typeof source.title === "string" ? source.title.trim() : "Resume Source";
    const externalId =
      typeof source.externalId === "string" && source.externalId.trim()
        ? source.externalId.trim()
        : `source-${sourceIndex + 1}`;
    const sourceType =
      typeof source.sourceType === "string" && source.sourceType.trim()
        ? source.sourceType.trim()
        : "resume";

    let content = "";
    try {
      content = await readSourceContent(source);
    } catch (error) {
      console.warn(
        `Static resume fallback skipped "${title}": ${toErrorMessage(error)}`,
      );
      continue;
    }

    const parsedChunks = chunkText(content, FALLBACK_CHUNK_OPTIONS);
    if (parsedChunks.length === 0) {
      continue;
    }

    const staticSourceId = `${FALLBACK_SOURCE_PREFIX}::${externalId}`;
    const sourceUrl =
      typeof source.sourceUrl === "string" && source.sourceUrl.trim()
        ? source.sourceUrl.trim()
        : undefined;

    for (let chunkIndex = 0; chunkIndex < parsedChunks.length; chunkIndex++) {
      const snippet = parsedChunks[chunkIndex];
      chunks.push({
        id: `${staticSourceId}::${chunkIndex}`,
        sourceId: staticSourceId,
        title,
        url: sourceUrl,
        snippet,
        sourceType,
        chunkIndex,
        score: 0,
        order,
        rank: 0,
        searchText: `${title}\n${sourceType}\n${snippet}`,
      });
      order += 1;
    }
  }

  return chunks;
};

/**
 * Reads local resume knowledge files (manifest + text sources) as a no-network fallback.
 * This is intentionally file-backed so source entries can be inserted/updated/deleted
 * by editing the manifest and knowledge files without changing runtime code.
 */
export const retrieveStaticResumeFallbackSources = async (
  query: string,
  topK: number = DEFAULT_FALLBACK_TOP_K,
): Promise<SourceCitation[]> => {
  const fallbackTopK = Math.max(1, topK);

  let chunks: RankedStaticChunk[];
  try {
    chunks = await buildFallbackChunks();
  } catch (error) {
    console.warn(
      `Static resume fallback retrieval failed: ${toErrorMessage(error)}`,
    );
    return [];
  }

  if (chunks.length === 0) {
    console.warn("Static resume fallback has no available chunks.");
    return [];
  }

  const terms = extractQueryTerms(query);
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      rank: scoreChunk(terms, chunk.searchText),
    }))
    .sort((a, b) => {
      if (b.rank === a.rank) return a.order - b.order;
      return b.rank - a.rank;
    })
    .slice(0, fallbackTopK)
    .map(({ order, rank, searchText, ...citation }) => ({
      ...citation,
      score: rank,
    }));

  return ranked;
};
