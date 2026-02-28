---
name: rag-knowledge
description: Use when changing Lumina's retrieval and grounded-answer workflow, including server/src/services/knowledgeBase.ts, Pinecone access, retrieval ranking, knowledge source models, citation generation, or debugging why responses are or are not grounded in indexed content.
---

# RAG Knowledge

Use this skill for retrieval behavior and grounded-answer integrity.

## First read

- `@server/CLAUDE.md`
- `@RAG.md`
- `@.claude/skills/references/rag-workflow.md`

## Workflow

1. Preserve the contract that answers should be grounded in indexed sources.
2. Keep inline citations and source lists coherent with the retrieval output.
3. Separate ingestion concerns from chat-route concerns when possible.
4. If the task is actually about mutating indexed content, use `/knowledge-ops` instead of improvising ad hoc scripts.
5. If no relevant source exists, prefer a clear no-match path over unsupported fabrication.

## Validation

- Run `cd server && npm run build`.
- Use targeted knowledge or Pinecone scripts only when credentials and external services are available.

## Common traps

- Retrieval changes can silently break frontend citations even when the server still compiles.
- Source lifecycle semantics should stay coherent across list, view, upsert, delete, and sync flows.
