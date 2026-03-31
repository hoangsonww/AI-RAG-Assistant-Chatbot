import { GoogleGenerativeAI } from "@google/generative-ai";
import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import {
  isNeo4jConfigured,
  getWriteSession,
  getSession,
  withRetry,
} from "./neo4jClient";
import type { SourceCitation } from "./knowledgeBase";
import type {
  EntityType,
  RelationshipType,
  ExtractionResult,
  GraphEntity,
  GraphRelationship,
  GraphStats,
} from "../types/graph";

dotenv.config();

const ENTITY_TYPES: ReadonlySet<string> = new Set<EntityType>([
  "Person",
  "Organization",
  "Project",
  "Technology",
  "Skill",
  "Location",
  "Certification",
  "Education",
  "Award",
  "Publication",
]);

const RELATIONSHIP_TYPES: ReadonlySet<string> = new Set<RelationshipType>([
  "WORKED_AT",
  "WORKED_ON",
  "USES_TECH",
  "HAS_SKILL",
  "STUDIED_AT",
  "EARNED",
  "PUBLISHED",
  "AWARDED",
  "LOCATED_IN",
]);

const EXTRACTION_CONCURRENCY = 2;
const GRAPH_RETRIEVAL_TOP_K = 15;
const EXTRACTION_RETRY_ATTEMPTS = 3;
const EXTRACTION_BASE_DELAY_MS = 15_000;

const EXTRACTION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
];

const getGenAI = (): GoogleGenerativeAI =>
  new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const runWithExtractModelRotation = async (
  systemInstruction: string,
  content: string,
): Promise<string> => {
  const genAI = getGenAI();
  let lastError: unknown = null;

  for (const modelName of EXTRACTION_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });
      const result = await model.generateContent(content);
      return result.response.text();
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || "";
      // If rate limited on this model, try the next one immediately
      if (msg.includes("429") || msg.includes("Too Many Requests")) {
        continue;
      }
      // For non-rate-limit errors, still try next model
      continue;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("All extraction models failed.");
};

const ENTITY_EXTRACTION_PROMPT = `You are an entity extraction engine. Extract named entities and their relationships from the given text.

Return ONLY valid JSON with this exact structure:
{
  "entities": [{"name": "exact name", "type": "Person|Organization|Project|Technology|Skill|Location|Certification|Education|Award|Publication", "description": "brief description"}],
  "relationships": [{"from": "entity name", "to": "entity name", "type": "WORKED_AT|WORKED_ON|USES_TECH|HAS_SKILL|STUDIED_AT|EARNED|PUBLISHED|AWARDED|LOCATED_IN"}]
}

Rules:
- Extract ALL meaningful entities — people, companies, projects, technologies, skills, locations, certifications, awards, publications.
- Only use the entity types and relationship types listed above.
- Use exact names as they appear in the text.
- Create relationships only between entities you extracted.
- If no entities found, return {"entities": [], "relationships": []}.`;

const QUERY_ENTITY_PROMPT = `Extract entity names mentioned in this question. Return ONLY a valid JSON array of strings.
Examples:
- "What projects use React?" -> ["React"]
- "Tell me about David's work at LexisNexis" -> ["David", "LexisNexis"]
- "What skills does he have?" -> []
If no specific entities, return [].`;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withRateLimitRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number = EXTRACTION_RETRY_ATTEMPTS,
): Promise<T> => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const message = error?.message || "";
      const isRateLimit =
        message.includes("429") || message.includes("Too Many Requests");
      if (!isRateLimit || i === attempts - 1) throw error;
      const delay = EXTRACTION_BASE_DELAY_MS * (i + 1);
      console.log(`Rate limited, retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
  throw new Error("Retry exhausted");
};

const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g;
const escapeLucene = (term: string): string =>
  term.replace(LUCENE_SPECIAL, "\\$&");

const parseJsonSafe = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
};

const validateEntity = (e: any): e is GraphEntity =>
  typeof e?.name === "string" &&
  e.name.trim().length > 0 &&
  typeof e?.type === "string" &&
  ENTITY_TYPES.has(e.type);

const validateRelationship = (
  r: any,
  entityNames: Set<string>,
): r is GraphRelationship =>
  typeof r?.from === "string" &&
  typeof r?.to === "string" &&
  typeof r?.type === "string" &&
  RELATIONSHIP_TYPES.has(r.type) &&
  entityNames.has(r.from) &&
  entityNames.has(r.to);

export const extractEntitiesFromChunk = async (
  text: string,
): Promise<ExtractionResult> => {
  const responseText = await withRateLimitRetry(async () =>
    runWithExtractModelRotation(ENTITY_EXTRACTION_PROMPT, text),
  );
  const parsed = parseJsonSafe<{ entities?: any[]; relationships?: any[] }>(
    responseText,
    { entities: [], relationships: [] },
  );

  const entities = (parsed.entities || []).filter(validateEntity);
  const entityNames = new Set(entities.map((e) => e.name));
  const relationships = (parsed.relationships || []).filter((r) =>
    validateRelationship(r, entityNames),
  );

  return { entities, relationships };
};

const BATCH_EXTRACTION_PROMPT = `You are an entity extraction engine. Extract named entities and their relationships from ALL the text chunks below. Each chunk is delimited by [CHUNK N] markers.

Return ONLY valid JSON with this exact structure:
{
  "chunks": [
    {
      "index": 0,
      "entities": [{"name": "exact name", "type": "Person|Organization|Project|Technology|Skill|Location|Certification|Education|Award|Publication", "description": "brief description"}],
      "relationships": [{"from": "entity name", "to": "entity name", "type": "WORKED_AT|WORKED_ON|USES_TECH|HAS_SKILL|STUDIED_AT|EARNED|PUBLISHED|AWARDED|LOCATED_IN"}]
    }
  ]
}

Rules:
- Process EVERY chunk and return results for each, using the chunk index.
- Extract ALL meaningful entities from each chunk.
- Only use the entity types and relationship types listed above.
- Use exact names as they appear in the text.
- Create relationships only between entities extracted from the same chunk.`;

const ENTITY_EXTRACTION_BATCH_SIZE = 5;

export const extractEntitiesBatch = async (
  chunks: string[],
): Promise<ExtractionResult[]> => {
  const results: ExtractionResult[] = new Array(chunks.length)
    .fill(null)
    .map(() => ({ entities: [], relationships: [] }));

  for (
    let batchStart = 0;
    batchStart < chunks.length;
    batchStart += ENTITY_EXTRACTION_BATCH_SIZE
  ) {
    const batchEnd = Math.min(
      batchStart + ENTITY_EXTRACTION_BATCH_SIZE,
      chunks.length,
    );
    const batchChunks = chunks.slice(batchStart, batchEnd);

    const content = batchChunks
      .map((chunk, i) => `[CHUNK ${i}]\n${chunk}`)
      .join("\n\n");

    try {
      const responseText = await withRateLimitRetry(async () =>
        runWithExtractModelRotation(BATCH_EXTRACTION_PROMPT, content),
      );

      const parsed = parseJsonSafe<{ chunks?: any[] }>(responseText, {
        chunks: [],
      });

      for (const chunkResult of parsed.chunks || []) {
        const idx =
          typeof chunkResult?.index === "number" ? chunkResult.index : -1;
        if (idx < 0 || idx >= batchChunks.length) continue;

        const entities = (chunkResult.entities || []).filter(validateEntity);
        const entityNames = new Set<string>(
          entities.map((e: GraphEntity) => e.name),
        );
        const relationships = (chunkResult.relationships || []).filter(
          (r: any) => validateRelationship(r, entityNames),
        );

        results[batchStart + idx] = { entities, relationships };
      }

      console.log(
        `  Extracted entities for chunks ${batchStart}-${batchEnd - 1} (${batchChunks.length} chunks in 1 call)`,
      );
    } catch (err) {
      console.warn(
        `  Batch extraction failed for chunks ${batchStart}-${batchEnd - 1}:`,
        (err as Error).message.substring(0, 80),
      );
    }
  }

  return results;
};

export const extractQueryEntities = async (
  query: string,
): Promise<string[]> => {
  const responseText = await withRateLimitRetry(async () =>
    runWithExtractModelRotation(QUERY_ENTITY_PROMPT, query),
  );
  const parsed = parseJsonSafe<string[]>(responseText, []);

  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
};

const runConcurrent = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
};

export const ingestChunksToGraph = async (
  sourceId: string,
  title: string,
  sourceType: string,
  sourceUrl: string | undefined,
  chunks: string[],
): Promise<void> => {
  if (!isNeo4jConfigured() || chunks.length === 0) return;

  // Extract entities in batches (5 chunks per LLM call to minimize API usage)
  const extractions = await extractEntitiesBatch(chunks);

  const session = getWriteSession();
  try {
    await withRetry(async () => {
      await session.executeWrite(async (tx) => {
        // Create/merge Document node
        await tx.run(
          `MERGE (d:Document {sourceId: $sourceId})
           SET d.title = $title, d.sourceType = $sourceType, d.sourceUrl = $sourceUrl`,
          { sourceId, title, sourceType, sourceUrl: sourceUrl || null },
        );

        // Create Chunk nodes and link to Document
        for (let i = 0; i < chunks.length; i++) {
          const chunkId = `${sourceId}::${i}`;
          await tx.run(
            `MERGE (c:Chunk {chunkId: $chunkId})
             SET c.text = $text, c.chunkIndex = $chunkIndex, c.sourceId = $sourceId,
                 c.title = $title, c.sourceType = $sourceType
             WITH c
             MATCH (d:Document {sourceId: $sourceId})
             MERGE (d)-[:HAS_CHUNK]->(c)`,
            {
              chunkId,
              text: chunks[i],
              chunkIndex: neo4j.int(i),
              sourceId,
              title,
              sourceType,
            },
          );

          // Create NEXT relationship between consecutive chunks
          if (i > 0) {
            const prevChunkId = `${sourceId}::${i - 1}`;
            await tx.run(
              `MATCH (prev:Chunk {chunkId: $prevChunkId}), (curr:Chunk {chunkId: $currChunkId})
               MERGE (prev)-[:NEXT]->(curr)`,
              { prevChunkId, currChunkId: chunkId },
            );
          }

          // Create Entity nodes and MENTIONS relationships
          const extraction = extractions[i];
          for (const entity of extraction.entities) {
            const normalizedName = entity.name.toLowerCase().trim();
            await tx.run(
              `MERGE (e:Entity {normalizedName: $normalizedName, type: $type})
               ON CREATE SET e.name = $name, e.description = $description
               WITH e
               MATCH (c:Chunk {chunkId: $chunkId})
               MERGE (c)-[:MENTIONS]->(e)`,
              {
                normalizedName,
                type: entity.type,
                name: entity.name,
                description: entity.description || null,
                chunkId,
              },
            );
          }

          // Create RELATED_TO relationships between entities
          for (const rel of extraction.relationships) {
            const fromNorm = rel.from.toLowerCase().trim();
            const toNorm = rel.to.toLowerCase().trim();
            await tx.run(
              `MATCH (a:Entity {normalizedName: $fromNorm}), (b:Entity {normalizedName: $toNorm})
               MERGE (a)-[r:RELATED_TO {type: $relType}]->(b)`,
              { fromNorm, toNorm, relType: rel.type },
            );
          }
        }
      });
    });
    console.log(
      `Graph ingested: "${title}" (${chunks.length} chunks, ${extractions.reduce((s, e) => s + e.entities.length, 0)} entities)`,
    );
  } finally {
    await session.close();
  }
};

export const retrieveGraphChunks = async (
  query: string,
  topK: number = GRAPH_RETRIEVAL_TOP_K,
): Promise<SourceCitation[]> => {
  if (!isNeo4jConfigured()) return [];

  let entityNames: string[];
  try {
    entityNames = await extractQueryEntities(query);
  } catch {
    return [];
  }

  if (entityNames.length === 0) return [];

  const searchTerms = entityNames
    .map((n) => escapeLucene(n.toLowerCase().trim()))
    .join(" OR ");

  const session = getSession();
  try {
    const result = await withRetry(async () =>
      session.run(
        `CALL db.index.fulltext.queryNodes('entity_name_ft', $searchTerms)
         YIELD node AS entity, score AS matchScore
         WITH entity, matchScore
         OPTIONAL MATCH (entity)-[:RELATED_TO]-(related:Entity)
         WITH COLLECT(DISTINCT entity) + COLLECT(DISTINCT related) AS allEntities
         UNWIND allEntities AS e
         MATCH (chunk:Chunk)-[:MENTIONS]->(e)
         WITH chunk, COUNT(DISTINCT e) AS matchCount
         MATCH (d:Document)-[:HAS_CHUNK]->(chunk)
         RETURN chunk.chunkId AS chunkId,
                chunk.text AS text,
                chunk.sourceId AS sourceId,
                chunk.title AS title,
                chunk.sourceType AS sourceType,
                chunk.chunkIndex AS chunkIndex,
                d.sourceUrl AS sourceUrl,
                matchCount
         ORDER BY matchCount DESC
         LIMIT $topK`,
        { searchTerms, topK: neo4j.int(topK) },
      ),
    );

    const maxMatch = Math.max(
      ...result.records.map((r) => toNumber(r.get("matchCount"))),
      1,
    );

    return result.records.map((record) => ({
      id: record.get("chunkId") as string,
      sourceId: record.get("sourceId") as string,
      title: record.get("title") as string,
      url: (record.get("sourceUrl") as string) || undefined,
      snippet: record.get("text") as string,
      score: toNumber(record.get("matchCount")) / maxMatch,
      sourceType: record.get("sourceType") as string,
      chunkIndex: toNumber(record.get("chunkIndex")),
    }));
  } catch (err) {
    console.warn(
      "Graph retrieval failed, falling back to vector-only:",
      (err as Error).message,
    );
    return [];
  } finally {
    await session.close();
  }
};

export const deleteGraphDocument = async (sourceId: string): Promise<void> => {
  if (!isNeo4jConfigured()) return;

  const session = getWriteSession();
  try {
    await withRetry(async () => {
      await session.executeWrite(async (tx) => {
        // Collect entities connected to this document's chunks before deleting
        await tx.run(
          `MATCH (d:Document {sourceId: $sourceId})-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
           WITH COLLECT(DISTINCT e) AS candidates, COLLECT(DISTINCT c) AS chunks
           FOREACH (c IN chunks | DETACH DELETE c)
           WITH candidates
           UNWIND candidates AS e
           WITH e WHERE NOT (e)<-[:MENTIONS]-()
           DETACH DELETE e`,
          { sourceId },
        );
        await tx.run(
          `MATCH (d:Document {sourceId: $sourceId}) DETACH DELETE d`,
          { sourceId },
        );
      });
    });
  } finally {
    await session.close();
  }
};

export const resetGraph = async (): Promise<void> => {
  if (!isNeo4jConfigured()) return;

  const session = getWriteSession();
  try {
    await withRetry(async () => {
      await session.executeWrite(async (tx) => {
        // Delete all nodes and relationships in batches to avoid memory issues
        let deleted = 1;
        while (deleted > 0) {
          const result = await tx.run(
            `MATCH (n) WITH n LIMIT 5000 DETACH DELETE n RETURN COUNT(*) AS deleted`,
          );
          deleted = toNumber(result.records[0]?.get("deleted") ?? 0);
        }
      });
    });
    console.log("Neo4j graph reset — all nodes and relationships deleted.");
  } finally {
    await session.close();
  }
};

export const getGraphStats = async (): Promise<GraphStats> => {
  if (!isNeo4jConfigured()) {
    return {
      documentCount: 0,
      chunkCount: 0,
      entityCount: 0,
      relationshipCount: 0,
    };
  }

  const session = getSession();
  try {
    const result = await session.run(
      `OPTIONAL MATCH (d:Document) WITH COUNT(d) AS docs
       OPTIONAL MATCH (c:Chunk) WITH docs, COUNT(c) AS chunks
       OPTIONAL MATCH (e:Entity) WITH docs, chunks, COUNT(e) AS entities
       OPTIONAL MATCH ()-[r:RELATED_TO]->() WITH docs, chunks, entities, COUNT(r) AS rels
       RETURN docs, chunks, entities, rels`,
    );

    const record = result.records[0];
    return {
      documentCount: record ? toNumber(record.get("docs")) : 0,
      chunkCount: record ? toNumber(record.get("chunks")) : 0,
      entityCount: record ? toNumber(record.get("entities")) : 0,
      relationshipCount: record ? toNumber(record.get("rels")) : 0,
    };
  } finally {
    await session.close();
  }
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number(value) || 0;
};
