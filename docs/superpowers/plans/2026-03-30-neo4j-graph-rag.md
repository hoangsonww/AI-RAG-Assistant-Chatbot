# Neo4j Graph RAG Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Neo4j AuraDB as a parallel graph retrieval path alongside Pinecone, with entity extraction, hybrid merge, unified citations, and full ingestion of all .txt knowledge documents.

**Architecture:** New Neo4j client + graph knowledge service sit alongside existing Pinecone client + knowledgeBase service. Both retrieval paths run in parallel via `Promise.allSettled`, results merge into a single ranked `SourceCitation[]`. Entity extraction uses Gemini at both ingest-time (per-chunk) and query-time (per-query). Graceful degradation: if Neo4j is unconfigured or down, the system behaves exactly as today.

**Tech Stack:** neo4j-driver 5.x, existing Gemini API (@google/generative-ai), TypeScript, Express, MongoDB/Mongoose

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `server/src/types/graph.ts` | TypeScript types for graph entities, relationships, extraction results |
| `server/src/services/neo4jClient.ts` | Neo4j driver connection, session factory, health check, schema init, shutdown |
| `server/src/services/graphKnowledge.ts` | Entity extraction (ingest + query), graph ingestion, graph retrieval, graph deletion, stats, rebuild |

### Modified Files
| File | Change |
|------|--------|
| `server/package.json` | Add `neo4j-driver` dependency |
| `server/src/services/knowledgeBase.ts` | Call graph ingestion after Pinecone upsert; call graph deletion alongside Pinecone deletion |
| `server/src/services/geminiService.ts` | Run graph retrieval in parallel with vector retrieval; merge results |
| `server/src/scripts/knowledgeCli.ts` | Add `graph:status` and `graph:rebuild` commands; update delete to remove graph nodes |
| `server/src/server.ts` | Initialize Neo4j on startup; close on shutdown |

---

## Task 1: Install neo4j-driver and add graph types

**Files:**
- Modify: `server/package.json`
- Create: `server/src/types/graph.ts`

- [ ] **Step 1: Install neo4j-driver**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npm install neo4j-driver
```

- [ ] **Step 2: Create graph types file**

Create `server/src/types/graph.ts`:

```typescript
export type EntityType =
  | "Person"
  | "Organization"
  | "Project"
  | "Technology"
  | "Skill"
  | "Location"
  | "Certification"
  | "Education"
  | "Award"
  | "Publication";

export type RelationshipType =
  | "WORKED_AT"
  | "WORKED_ON"
  | "USES_TECH"
  | "HAS_SKILL"
  | "STUDIED_AT"
  | "EARNED"
  | "PUBLISHED"
  | "AWARDED"
  | "LOCATED_IN";

export interface GraphEntity {
  readonly name: string;
  readonly type: EntityType;
  readonly description?: string;
}

export interface GraphRelationship {
  readonly from: string;
  readonly to: string;
  readonly type: RelationshipType;
}

export interface ExtractionResult {
  readonly entities: GraphEntity[];
  readonly relationships: GraphRelationship[];
}

export interface GraphStats {
  readonly documentCount: number;
  readonly chunkCount: number;
  readonly entityCount: number;
  readonly relationshipCount: number;
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/src/types/graph.ts
git commit -m "feat(graph): install neo4j-driver and add graph type definitions"
```

---

## Task 2: Create Neo4j client with connection management

**Files:**
- Create: `server/src/services/neo4jClient.ts`

- [ ] **Step 1: Create the Neo4j client module**

Create `server/src/services/neo4jClient.ts`:

```typescript
import neo4j, { Driver, Session, SessionMode } from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

let driver: Driver | null = null;

export const isNeo4jConfigured = (): boolean =>
  Boolean(process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD);

const getDriver = (): Driver => {
  if (driver) return driver;

  if (!isNeo4jConfigured()) {
    throw new Error("Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD.");
  }

  driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10_000,
      maxTransactionRetryTime: 30_000,
    },
  );

  return driver;
};

export const getSession = (mode: SessionMode = neo4j.session.READ): Session =>
  getDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
    defaultAccessMode: mode,
  });

export const getWriteSession = (): Session => getSession(neo4j.session.WRITE);

export const withRetry = async <T>(
  fn: () => Promise<T>,
  attempts: number = MAX_RETRY_ATTEMPTS,
): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const code = error?.code || "";
      const isTransient =
        code === "ServiceUnavailable" ||
        code === "SessionExpired" ||
        code.includes("TransientError");
      if (!isTransient || i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, INITIAL_RETRY_DELAY_MS * Math.pow(2, i)));
    }
  }
  throw lastError;
};

export const initGraphSchema = async (): Promise<void> => {
  if (!isNeo4jConfigured()) {
    console.log("Neo4j not configured — graph features disabled.");
    return;
  }

  const session = getWriteSession();
  try {
    await session.run(
      "CREATE CONSTRAINT doc_source_id IF NOT EXISTS FOR (d:Document) REQUIRE d.sourceId IS UNIQUE",
    );
    await session.run(
      "CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (c:Chunk) REQUIRE c.chunkId IS UNIQUE",
    );
    await session.run(
      "CREATE INDEX entity_normalized IF NOT EXISTS FOR (e:Entity) ON (e.normalizedName, e.type)",
    );
    await session.run(
      "CREATE FULLTEXT INDEX entity_name_ft IF NOT EXISTS FOR (e:Entity) ON EACH [e.name, e.normalizedName]",
    );
    console.log("Neo4j graph schema initialized.");
  } finally {
    await session.close();
  }
};

export const isNeo4jHealthy = async (): Promise<boolean> => {
  if (!isNeo4jConfigured()) return false;
  const session = getSession();
  try {
    await session.run("RETURN 1");
    return true;
  } catch {
    return false;
  } finally {
    await session.close();
  }
};

export const closeNeo4j = async (): Promise<void> => {
  if (driver) {
    await driver.close();
    driver = null;
  }
};
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/neo4jClient.ts
git commit -m "feat(graph): add Neo4j client with connection pooling, retry logic, and schema init"
```

---

## Task 3: Create graph knowledge service — entity extraction

**Files:**
- Create: `server/src/services/graphKnowledge.ts`

- [ ] **Step 1: Create the graph knowledge service with entity extraction functions**

Create `server/src/services/graphKnowledge.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
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
  "Person", "Organization", "Project", "Technology", "Skill",
  "Location", "Certification", "Education", "Award", "Publication",
]);

const RELATIONSHIP_TYPES: ReadonlySet<string> = new Set<RelationshipType>([
  "WORKED_AT", "WORKED_ON", "USES_TECH", "HAS_SKILL",
  "STUDIED_AT", "EARNED", "PUBLISHED", "AWARDED", "LOCATED_IN",
]);

const EXTRACTION_CONCURRENCY = 5;
const GRAPH_RETRIEVAL_TOP_K = 15;

const getGenAI = (): GoogleGenerativeAI =>
  new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

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

const parseJsonSafe = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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

const validateRelationship = (r: any, entityNames: Set<string>): r is GraphRelationship =>
  typeof r?.from === "string" &&
  typeof r?.to === "string" &&
  typeof r?.type === "string" &&
  RELATIONSHIP_TYPES.has(r.type) &&
  entityNames.has(r.from) &&
  entityNames.has(r.to);

export const extractEntitiesFromChunk = async (
  text: string,
): Promise<ExtractionResult> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: ENTITY_EXTRACTION_PROMPT,
  });

  const result = await model.generateContent(text);
  const responseText = result.response.text();
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

export const extractQueryEntities = async (
  query: string,
): Promise<string[]> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: QUERY_ENTITY_PROMPT,
  });

  const result = await model.generateContent(query);
  const responseText = result.response.text();
  const parsed = parseJsonSafe<string[]>(responseText, []);

  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
};

const runConcurrent = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
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

  // Extract entities from all chunks concurrently
  const extractions = await runConcurrent(
    chunks,
    async (chunk) => {
      try {
        return await extractEntitiesFromChunk(chunk);
      } catch (err) {
        console.warn("Entity extraction failed for chunk, skipping:", (err as Error).message);
        return { entities: [], relationships: [] } as ExtractionResult;
      }
    },
    EXTRACTION_CONCURRENCY,
  );

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
            { chunkId, text: chunks[i], chunkIndex: i, sourceId, title, sourceType },
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
    console.log(`Graph ingested: "${title}" (${chunks.length} chunks, ${extractions.reduce((s, e) => s + e.entities.length, 0)} entities)`);
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

  const searchTerms = entityNames.map((n) => n.toLowerCase().trim()).join(" OR ");

  const session = getSession();
  try {
    const result = await withRetry(async () =>
      session.run(
        `CALL db.index.fulltext.queryNodes('entity_name_ft', $searchTerms)
         YIELD node AS entity, score AS matchScore
         WITH entity, matchScore
         OPTIONAL MATCH (entity)-[:RELATED_TO]-(related:Entity)
         WITH COLLECT(DISTINCT entity) + COLLECT(DISTINCT related) AS allEntities,
              COLLECT(DISTINCT matchScore) AS scores
         UNWIND allEntities AS e
         WITH e, scores
         MATCH (chunk:Chunk)-[:MENTIONS]->(e)
         WITH chunk, COUNT(DISTINCT e) AS matchCount, scores
         RETURN chunk.chunkId AS chunkId,
                chunk.text AS text,
                chunk.sourceId AS sourceId,
                chunk.title AS title,
                chunk.sourceType AS sourceType,
                chunk.chunkIndex AS chunkIndex,
                matchCount
         ORDER BY matchCount DESC
         LIMIT $topK`,
        { searchTerms, topK: neo4jInt(topK) },
      ),
    );

    const maxMatch = Math.max(...result.records.map((r) => toNumber(r.get("matchCount"))), 1);

    return result.records.map((record) => ({
      id: record.get("chunkId") as string,
      sourceId: record.get("sourceId") as string,
      title: record.get("title") as string,
      snippet: record.get("text") as string,
      score: toNumber(record.get("matchCount")) / maxMatch,
      sourceType: record.get("sourceType") as string,
      chunkIndex: toNumber(record.get("chunkIndex")),
    }));
  } catch (err) {
    console.warn("Graph retrieval failed, falling back to vector-only:", (err as Error).message);
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
        // Delete chunks and their relationships, then the document
        await tx.run(
          `MATCH (d:Document {sourceId: $sourceId})-[:HAS_CHUNK]->(c:Chunk)
           DETACH DELETE c`,
          { sourceId },
        );
        await tx.run(
          `MATCH (d:Document {sourceId: $sourceId}) DETACH DELETE d`,
          { sourceId },
        );
        // Clean up orphaned entities (entities with no MENTIONS)
        await tx.run(
          `MATCH (e:Entity) WHERE NOT (e)<-[:MENTIONS]-() DETACH DELETE e`,
        );
      });
    });
  } finally {
    await session.close();
  }
};

export const getGraphStats = async (): Promise<GraphStats> => {
  if (!isNeo4jConfigured()) {
    return { documentCount: 0, chunkCount: 0, entityCount: 0, relationshipCount: 0 };
  }

  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (d:Document) WITH COUNT(d) AS docs
       MATCH (c:Chunk) WITH docs, COUNT(c) AS chunks
       MATCH (e:Entity) WITH docs, chunks, COUNT(e) AS entities
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

const neo4jInt = (value: number): any => {
  const neo4jImport = require("neo4j-driver");
  return neo4jImport.int(value);
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number(value) || 0;
};
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/graphKnowledge.ts
git commit -m "feat(graph): add graph knowledge service with entity extraction, ingestion, retrieval, and deletion"
```

---

## Task 4: Integrate graph ingestion into knowledge base service

**Files:**
- Modify: `server/src/services/knowledgeBase.ts`

- [ ] **Step 1: Add graph imports at top of knowledgeBase.ts**

After the existing imports (line 4), add:

```typescript
import { isNeo4jConfigured } from "./neo4jClient";
import { ingestChunksToGraph, deleteGraphDocument } from "./graphKnowledge";
```

- [ ] **Step 2: Add graph ingestion to `ingestKnowledgeSource`**

After the Pinecone batch upsert loop (after line 259 — the closing brace of `for (let i = 0...)`), add graph ingestion:

```typescript
  // Ingest to Neo4j graph (non-fatal)
  if (isNeo4jConfigured()) {
    try {
      await ingestChunksToGraph(
        options.sourceId,
        options.title,
        options.sourceType,
        options.sourceUrl,
        chunks,
      );
    } catch (err) {
      console.warn("Graph ingestion failed (non-fatal):", (err as Error).message);
    }
  }
```

- [ ] **Step 3: Add graph deletion to `deleteKnowledgeSourceVectors`**

At the beginning of `deleteKnowledgeSourceVectors`, before the existing try block, add:

```typescript
  // Delete from Neo4j graph (non-fatal)
  if (isNeo4jConfigured()) {
    try {
      await deleteGraphDocument(sourceId);
    } catch (err) {
      console.warn("Graph deletion failed (non-fatal):", (err as Error).message);
    }
  }
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/knowledgeBase.ts
git commit -m "feat(graph): integrate graph ingestion and deletion into knowledge base pipeline"
```

---

## Task 5: Integrate graph retrieval into Gemini service (hybrid merge)

**Files:**
- Modify: `server/src/services/geminiService.ts`

- [ ] **Step 1: Add imports at top of geminiService.ts**

After the existing imports (line 9), add:

```typescript
import { isNeo4jConfigured } from "./neo4jClient";
import { retrieveGraphChunks } from "./graphKnowledge";
```

- [ ] **Step 2: Add the merge function**

After the `RAG_TOP_K` constant declaration (after line 27), add:

```typescript
const DUAL_SOURCE_BONUS = 0.1;

const mergeRetrievalResults = (
  vectorResults: SourceCitation[],
  graphResults: SourceCitation[],
  topK: number,
): SourceCitation[] => {
  const merged = new Map<string, SourceCitation & { finalScore: number }>();

  for (const source of vectorResults) {
    merged.set(source.id, { ...source, finalScore: source.score ?? 0 });
  }

  for (const source of graphResults) {
    const existing = merged.get(source.id);
    if (existing) {
      existing.finalScore = Math.max(existing.finalScore, source.score ?? 0) + DUAL_SOURCE_BONUS;
    } else {
      merged.set(source.id, { ...source, finalScore: source.score ?? 0 });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK)
    .map(({ finalScore, ...rest }) => ({ ...rest, score: finalScore }));
};
```

- [ ] **Step 3: Replace the retrieval call in `chatWithAI`**

Replace line 333:
```typescript
  const sources = await retrieveKnowledgeChunks(message, RAG_TOP_K);
```

With:
```typescript
  let sources: SourceCitation[];
  if (isNeo4jConfigured()) {
    const [vectorResult, graphResult] = await Promise.allSettled([
      retrieveKnowledgeChunks(message, RAG_TOP_K + 5),
      retrieveGraphChunks(message, RAG_TOP_K + 5),
    ]);
    const vectorSources = vectorResult.status === "fulfilled" ? vectorResult.value : [];
    const graphSources = graphResult.status === "fulfilled" ? graphResult.value : [];
    sources = mergeRetrievalResults(vectorSources, graphSources, RAG_TOP_K);
  } else {
    sources = await retrieveKnowledgeChunks(message, RAG_TOP_K);
  }
```

- [ ] **Step 4: Replace the retrieval call in `streamChatWithAI`**

Replace line 385:
```typescript
  const sources = await retrieveKnowledgeChunks(message, RAG_TOP_K);
```

With the same block:
```typescript
  let sources: SourceCitation[];
  if (isNeo4jConfigured()) {
    const [vectorResult, graphResult] = await Promise.allSettled([
      retrieveKnowledgeChunks(message, RAG_TOP_K + 5),
      retrieveGraphChunks(message, RAG_TOP_K + 5),
    ]);
    const vectorSources = vectorResult.status === "fulfilled" ? vectorResult.value : [];
    const graphSources = graphResult.status === "fulfilled" ? graphResult.value : [];
    sources = mergeRetrievalResults(vectorSources, graphSources, RAG_TOP_K);
  } else {
    sources = await retrieveKnowledgeChunks(message, RAG_TOP_K);
  }
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/geminiService.ts
git commit -m "feat(graph): add hybrid graph+vector retrieval with parallel merge in Gemini service"
```

---

## Task 6: Add graph CLI commands and update delete

**Files:**
- Modify: `server/src/scripts/knowledgeCli.ts`

- [ ] **Step 1: Add imports**

After the existing imports (after line 13), add:

```typescript
import { isNeo4jConfigured, initGraphSchema, closeNeo4j } from "../services/neo4jClient";
import {
  getGraphStats,
  ingestChunksToGraph,
  extractEntitiesFromChunk,
  deleteGraphDocument,
} from "../services/graphKnowledge";
import { chunkText } from "../services/knowledgeBase";
```

- [ ] **Step 2: Add graph:status command function**

Before the `printHelp` function, add:

```typescript
const graphStatus = async () => {
  if (!isNeo4jConfigured()) {
    console.log("Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD.");
    return;
  }

  await initGraphSchema();
  const stats = await getGraphStats();
  console.log("Neo4j Graph Status:");
  console.log(`  Documents: ${stats.documentCount}`);
  console.log(`  Chunks:    ${stats.chunkCount}`);
  console.log(`  Entities:  ${stats.entityCount}`);
  console.log(`  Relations: ${stats.relationshipCount}`);
};

const graphRebuild = async () => {
  if (!isNeo4jConfigured()) {
    console.log("Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD.");
    return;
  }

  await initGraphSchema();
  const sources = await KnowledgeSource.find().sort({ updatedAt: -1 });

  if (sources.length === 0) {
    console.log("No knowledge sources found to rebuild.");
    return;
  }

  console.log(`Rebuilding graph for ${sources.length} source(s)...`);

  for (const source of sources) {
    const chunks = chunkText(source.content);
    if (chunks.length === 0) {
      console.log(`  Skipping "${source.title}" (no chunks).`);
      continue;
    }

    try {
      await ingestChunksToGraph(
        source._id.toString(),
        source.title,
        source.sourceType,
        source.sourceUrl,
        chunks,
      );
      console.log(`  Rebuilt "${source.title}" (${chunks.length} chunks).`);
    } catch (err) {
      console.error(`  Failed "${source.title}":`, (err as Error).message);
    }
  }

  const stats = await getGraphStats();
  console.log(`\nRebuild complete: ${stats.documentCount} docs, ${stats.chunkCount} chunks, ${stats.entityCount} entities, ${stats.relationshipCount} relations.`);
};
```

- [ ] **Step 3: Update `deleteSource` to also delete graph data**

In the `deleteSource` function, after line 191 (`await deleteKnowledgeSourceVectors(...)`), add:

```typescript
  if (isNeo4jConfigured()) {
    try {
      await deleteGraphDocument(sourceRecord._id.toString());
    } catch (err) {
      console.warn("Graph deletion warning:", (err as Error).message);
    }
  }
```

- [ ] **Step 4: Update the `repl` delete handler similarly**

In the repl's delete command (around line 334, after `await deleteKnowledgeSourceVectors(...)`), add:

```typescript
      if (isNeo4jConfigured()) {
        try {
          await deleteGraphDocument(source._id.toString());
        } catch (err) {
          console.warn("Graph deletion warning:", (err as Error).message);
        }
      }
```

- [ ] **Step 5: Update REPL help text**

In the help command output (around line 291), add after the `delete <id>` line:

```typescript
      console.log("  graph:status                 Show graph database stats");
      console.log("  graph:rebuild                Rebuild graph from all sources");
```

- [ ] **Step 6: Add REPL handlers for graph commands**

In the REPL while loop, before the final `console.log("Unknown command...")` line, add:

```typescript
    if (command === "graph:status") {
      await graphStatus();
      continue;
    }

    if (command === "graph:rebuild") {
      const confirmation = await promptInput(rl, "Rebuild entire graph? (yes/no): ");
      if (confirmation.toLowerCase() !== "yes") {
        console.log("Cancelled.");
        continue;
      }
      await graphRebuild();
      continue;
    }
```

- [ ] **Step 7: Add CLI top-level commands for graph**

In the `run` function, in the command if/else chain (before the final `exitWithError`), add:

```typescript
  } else if (command === "graph:status") {
    if (isNeo4jConfigured()) await initGraphSchema();
    await graphStatus();
  } else if (command === "graph:rebuild") {
    if (isNeo4jConfigured()) await initGraphSchema();
    await graphRebuild();
```

- [ ] **Step 8: Add scripts to package.json**

In `server/package.json`, after the `"knowledge:sync"` script, add:

```json
    "knowledge:graph:status": "ts-node src/scripts/knowledgeCli.ts graph:status",
    "knowledge:graph:rebuild": "ts-node src/scripts/knowledgeCli.ts graph:rebuild"
```

- [ ] **Step 9: Add cleanup in `run` function**

At the end of the `run` function, before `await mongoose.disconnect()`, add:

```typescript
  if (isNeo4jConfigured()) {
    await closeNeo4j();
  }
```

- [ ] **Step 10: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add server/src/scripts/knowledgeCli.ts server/package.json
git commit -m "feat(graph): add graph:status and graph:rebuild CLI commands, update delete to clean graph"
```

---

## Task 7: Wire Neo4j into server startup and shutdown

**Files:**
- Modify: `server/src/server.ts`

- [ ] **Step 1: Add imports**

After the existing imports (after line 7), add:

```typescript
import { isNeo4jConfigured, initGraphSchema, closeNeo4j } from "./services/neo4jClient";
```

- [ ] **Step 2: Add Neo4j initialization after MongoDB connection**

After the MongoDB `.then()` block (after line 40), add:

```typescript

// Initialize Neo4j graph schema
if (isNeo4jConfigured()) {
  initGraphSchema()
    .then(() => console.log("Neo4j connected and schema ready"))
    .catch((err) => console.warn("Neo4j initialization warning:", err.message));
}
```

- [ ] **Step 3: Add graceful shutdown**

Before the final `export default app;` line, add:

```typescript

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down...");
  await closeNeo4j();
  await mongoose.disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/server.ts
git commit -m "feat(graph): wire Neo4j init and graceful shutdown into Express server"
```

---

## Task 8: Build and run graph:rebuild to ingest all documents

**Files:**
- None new — this is a runtime task using the CLI.

- [ ] **Step 1: Build the server**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npm run build
```

Expected: clean build with no errors.

- [ ] **Step 2: Run graph:rebuild to ingest all txt documents into Neo4j**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx ts-node src/scripts/knowledgeCli.ts graph:rebuild
```

Expected output: each source rebuilt with chunk and entity counts, final stats showing all documents indexed.

- [ ] **Step 3: Verify graph status**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && npx ts-node src/scripts/knowledgeCli.ts graph:status
```

Expected: non-zero counts for documents, chunks, entities, and relationships.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: verify graph rebuild completes successfully"
```

---

## Task 9: Full build validation and final commit

**Files:**
- All previously modified files.

- [ ] **Step 1: Clean build**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server && rm -rf dist && npm run build
```

Expected: no errors.

- [ ] **Step 2: Verify client still builds**

```bash
cd /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/client && npm run build
```

Expected: clean build (client is unchanged, this confirms no regressions).

- [ ] **Step 3: Verify all new files exist**

```bash
ls -la /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server/src/types/graph.ts \
       /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server/src/services/neo4jClient.ts \
       /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server/src/services/graphKnowledge.ts
```

Expected: all three files exist.

- [ ] **Step 4: Verify .env has Neo4j config**

```bash
grep NEO4J /Users/davidnguyen/WebstormProjects/AI-Assistant-Chatbot/server/.env
```

Expected: shows NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE lines.
