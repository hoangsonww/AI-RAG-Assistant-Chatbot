# Neo4j Graph RAG Integration Design

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Integrate Neo4j AuraDB graph database alongside existing Pinecone vector RAG for hybrid retrieval with unified citations.

---

## 1. Overview

Lumina currently uses Pinecone (vector similarity) as its sole RAG retrieval backend. This design adds Neo4j AuraDB as a parallel graph retrieval path, enabling entity-relationship traversal alongside semantic search. Both paths run simultaneously, results are merged, and citations remain unified.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Neo4j hosting | AuraDB (cloud) | Consistent with Pinecone cloud model, env-var configured |
| Retrieval strategy | Parallel merge | Best coverage — vector for semantics, graph for relationships |
| Graph model | Hybrid (entities + document/chunk nodes) | Rich relationships + citation traceability |
| Entity extraction | Ingest-time + query-time | Pre-built graph + query entity matching for effective traversal |
| Graceful degradation | Vector-only fallback | If Neo4j is down or unconfigured, system behaves as today |

---

## 2. Graph Schema

### Node Labels

| Label | Properties | Purpose |
|-------|-----------|---------|
| `Document` | `sourceId` (unique), `title`, `sourceType`, `sourceUrl`, `tags` | Maps 1:1 to MongoDB KnowledgeSource |
| `Chunk` | `chunkId` (unique), `text`, `chunkIndex`, `sourceId`, `title`, `sourceType` | Mirrors Pinecone vectors — citation anchor |
| `Entity` | `name`, `normalizedName` (lowercase, unique per type), `type`, `description` | Extracted named entities |

### Entity Types

`Person`, `Organization`, `Project`, `Technology`, `Skill`, `Location`, `Certification`, `Education`, `Award`, `Publication`

### Relationships

```
(:Document)-[:HAS_CHUNK]->(:Chunk)
(:Chunk)-[:NEXT]->(:Chunk)
(:Chunk)-[:MENTIONS]->(:Entity)
(:Entity)-[:RELATED_TO {type: string}]->(:Entity)
```

Relationship type values on `RELATED_TO`: `WORKED_AT`, `WORKED_ON`, `USES_TECH`, `HAS_SKILL`, `STUDIED_AT`, `EARNED`, `PUBLISHED`, `AWARDED`, `LOCATED_IN`.

### Indexes

```cypher
CREATE CONSTRAINT doc_source_id IF NOT EXISTS FOR (d:Document) REQUIRE d.sourceId IS UNIQUE;
CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (c:Chunk) REQUIRE c.chunkId IS UNIQUE;
CREATE INDEX entity_normalized IF NOT EXISTS FOR (e:Entity) ON (e.normalizedName, e.type);
CREATE FULLTEXT INDEX entity_name_ft IF NOT EXISTS FOR (e:Entity) ON EACH [e.name, e.normalizedName];
```

---

## 3. Entity Extraction

### At Ingest Time

For each chunk, call Gemini to extract structured entities:

```
System: "You are an entity extraction engine. Extract named entities and relationships from the given text."

User: "Extract entities and relationships from this text. Return ONLY valid JSON:
{
  \"entities\": [{\"name\": \"...\", \"type\": \"Person|Organization|Project|Technology|Skill|Location|Certification|Education|Award|Publication\", \"description\": \"...\"}],
  \"relationships\": [{\"from\": \"...\", \"to\": \"...\", \"type\": \"WORKED_AT|WORKED_ON|USES_TECH|HAS_SKILL|STUDIED_AT|EARNED|PUBLISHED|AWARDED|LOCATED_IN\"}]
}

Text: <chunk text>"
```

- MERGE on `normalizedName` + `type` to deduplicate entities across chunks
- Batch Neo4j writes per document (collect all chunk extractions, write in single transaction)
- Entity extraction errors are non-fatal — chunk still ingests to Pinecone
- Parallelized: 5 concurrent extractions per document

### At Query Time

Lightweight extraction from user message:

```
System: "Extract entity names mentioned in this question. Return ONLY a JSON array of strings."
User: "<user message>"
```

Single Gemini call, used to seed graph traversal. If extraction fails, graph path returns empty (vector path still works).

---

## 4. Retrieval & Merge Strategy

### Parallel Execution

```
User Query
  ├─ [Vector Path] (existing, unchanged)
  │   ├─ Generate query variants (up to 3)
  │   ├─ Embed each variant
  │   ├─ Query Pinecone topK=15 per variant
  │   ├─ Merge, deduplicate, lexical boost
  │   └─ Return top 15 SourceCitation[]
  │
  └─ [Graph Path] (new)
      ├─ Extract entities from query (Gemini call)
      ├─ Match entities in Neo4j (fulltext index, fuzzy)
      ├─ Traverse 1-2 hops from matched entities to Chunk nodes
      ├─ Score: entityMatchCount × (1 / hopDistance)
      ├─ Normalize scores to 0-1
      └─ Return top 15 SourceCitation[]
```

### Graph Retrieval Cypher

```cypher
CALL db.index.fulltext.queryNodes('entity_name_ft', $entityNames)
YIELD node AS entity, score AS matchScore
WITH entity, matchScore
MATCH (chunk:Chunk)-[:MENTIONS]->(entity)
WITH chunk, SUM(matchScore) AS totalScore, COUNT(entity) AS matchCount
RETURN chunk.chunkId AS chunkId,
       chunk.text AS text,
       chunk.sourceId AS sourceId,
       chunk.title AS title,
       chunk.sourceType AS sourceType,
       chunk.chunkIndex AS chunkIndex,
       totalScore,
       matchCount
ORDER BY totalScore DESC
LIMIT $topK
```

For 2-hop traversal (related entities):

```cypher
CALL db.index.fulltext.queryNodes('entity_name_ft', $entityNames)
YIELD node AS entity, score AS matchScore
WITH entity, matchScore
OPTIONAL MATCH (entity)-[:RELATED_TO]-(related:Entity)
WITH COLLECT(DISTINCT entity) + COLLECT(DISTINCT related) AS allEntities
UNWIND allEntities AS e
MATCH (chunk:Chunk)-[:MENTIONS]->(e)
WITH chunk, COUNT(DISTINCT e) AS matchCount
RETURN chunk.chunkId AS chunkId,
       chunk.text AS text,
       chunk.sourceId AS sourceId,
       chunk.title AS title,
       chunk.sourceType AS sourceType,
       chunk.chunkIndex AS chunkIndex,
       matchCount
ORDER BY matchCount DESC
LIMIT $topK
```

### Merge Algorithm

1. Collect results from both paths (up to 15 each)
2. Normalize scores: vector scores already 0-1 (cosine); graph scores normalized by dividing by max graph score
3. Deduplicate by `chunkId`:
   - If chunk appears in both paths: `finalScore = max(vectorScore, graphScore) + 0.1` (dual-source bonus)
   - If chunk appears in one path only: use that score
4. Apply existing lexical boost (0.15 weight)
5. Sort descending by finalScore
6. Return top 10 as `SourceCitation[]`

---

## 5. New Files

### `server/src/services/neo4jClient.ts`

- Neo4j driver initialization from env vars (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`)
- Session factory with configurable access mode (READ/WRITE)
- `isNeo4jConfigured()` — returns false if env vars missing (enables graceful skip)
- `isNeo4jHealthy()` — connectivity check for health endpoint
- `closeNeo4j()` — graceful shutdown
- `initGraphSchema()` — create constraints and indexes on startup

### `server/src/services/graphKnowledge.ts`

- `extractEntitiesFromChunk(text: string): Promise<ExtractionResult>` — Gemini entity extraction
- `extractQueryEntities(query: string): Promise<string[]>` — lightweight query entity extraction
- `ingestChunksToGraph(sourceId, title, sourceType, sourceUrl, chunks[]): Promise<void>` — write Document, Chunk, Entity, and relationship nodes
- `retrieveGraphChunks(query: string, topK: number): Promise<SourceCitation[]>` — graph traversal retrieval
- `deleteGraphDocument(sourceId: string): Promise<void>` — remove document and its chunks/orphaned entities
- `getGraphStats(): Promise<GraphStats>` — node/edge counts for CLI status
- `rebuildGraphFromPinecone(): Promise<void>` — re-extract entities from existing chunks (for initial migration)

### `server/src/types/graph.ts`

```typescript
export interface GraphEntity {
  name: string;
  type: EntityType;
  description?: string;
}

export type EntityType =
  | 'Person' | 'Organization' | 'Project' | 'Technology'
  | 'Skill' | 'Location' | 'Certification' | 'Education'
  | 'Award' | 'Publication';

export interface GraphRelationship {
  from: string;
  to: string;
  type: RelationshipType;
}

export type RelationshipType =
  | 'WORKED_AT' | 'WORKED_ON' | 'USES_TECH' | 'HAS_SKILL'
  | 'STUDIED_AT' | 'EARNED' | 'PUBLISHED' | 'AWARDED' | 'LOCATED_IN';

export interface ExtractionResult {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
}

export interface GraphStats {
  documentCount: number;
  chunkCount: number;
  entityCount: number;
  relationshipCount: number;
}
```

---

## 6. Modified Files

### `server/src/services/knowledgeBase.ts`

- After Pinecone batch upsert, call `ingestChunksToGraph()` with the same chunks and source metadata
- In `deleteKnowledgeSourceVectors()`, also call `deleteGraphDocument(sourceId)`
- Guard both with `isNeo4jConfigured()` — skip silently if Neo4j is not set up

### `server/src/services/geminiService.ts`

- In `retrieveKnowledgeChunks()`: if Neo4j is configured, run `retrieveGraphChunks()` in parallel with Pinecone query using `Promise.allSettled()`
- Add `mergeRetrievalResults(vectorResults, graphResults)` function implementing the merge algorithm
- No changes to prompt assembly, citation formatting, or streaming logic

### `server/src/scripts/knowledgeCli.ts`

- Add `graph:status` command — shows node/edge counts from `getGraphStats()`
- Add `graph:rebuild` command — re-ingests all existing KnowledgeSource documents into the graph (for initial migration)
- Update `delete` command to also remove graph data

### `server/src/server.ts`

- On startup: call `initGraphSchema()` if Neo4j is configured
- On shutdown (`SIGTERM`/`SIGINT`): call `closeNeo4j()`

### `server/package.json`

- Add dependency: `neo4j-driver: ^5.27.0`

---

## 7. Environment Configuration

```env
# Neo4j AuraDB
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=23ccce38
NEO4J_PASSWORD=<password>
NEO4J_DATABASE=neo4j
```

All Neo4j env vars are optional. If `NEO4J_URI` is missing, the system operates in vector-only mode (fully backwards compatible).

---

## 8. Enterprise Concerns

| Concern | Approach |
|---------|----------|
| Connection pooling | Neo4j driver manages pool natively; max pool size configurable |
| Retry logic | 3 retries with exponential backoff on transient errors (ServiceUnavailable, SessionExpired) |
| Graceful degradation | If Neo4j is down or unconfigured, vector-only retrieval runs as today |
| Health monitoring | `/api/health` reports Neo4j status alongside MongoDB and Pinecone |
| Shutdown | Driver `.close()` on SIGTERM/SIGINT |
| Ingestion resilience | Entity extraction errors are non-fatal; chunk still indexes in Pinecone |
| Query-time resilience | Graph retrieval failure returns empty array; vector results still used |
| Rate limiting | Entity extraction parallelized at 5 concurrent to avoid Gemini rate limits |

---

## 9. Citation Continuity

**No changes to the citation contract.** Both retrieval paths produce `SourceCitation` objects with identical shape:

```typescript
{
  id: string;          // chunkId ("sourceId::chunkIndex")
  sourceId: string;    // MongoDB KnowledgeSource _id
  title: string;       // Document title
  url?: string;        // Source URL
  snippet: string;     // Chunk text
  score: number;       // Merged/normalized score
  sourceType: string;  // resume|note|project|etc.
  chunkIndex: number;  // Chunk ordinal
}
```

Graph-retrieved chunks carry the same metadata as Pinecone vectors because `Chunk` nodes store `sourceId`, `title`, `sourceType`, and `text`. The LLM prompt, citation numbering, inline `[1]` references, and client-side rendering are completely unchanged.

---

## 10. Migration Plan

For existing data already in Pinecone:

1. Run `graph:rebuild` CLI command
2. This reads all `KnowledgeSource` documents from MongoDB
3. For each source, re-chunks the content and runs entity extraction
4. Writes Document, Chunk, Entity nodes and all relationships to Neo4j
5. Progress logged per-document

This is a one-time operation. After migration, all new ingestions automatically write to both stores.

---

## 11. What Does NOT Change

- MongoDB schemas (Conversation, GuestConversation, User, KnowledgeSource)
- Pinecone vector storage and retrieval logic
- LLM prompt structure and citation directives
- Client-side rendering, SSE streaming, source display
- Auth flows (JWT, guest)
- Knowledge CLI UX (upsert, delete, list, sync still work identically)
- API endpoint contracts (no new endpoints needed)
