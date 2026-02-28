# RAG Workflow

## Source of truth

- `RAG.md` documents the intended CLI-first ingestion flow.
- `server/src/scripts/knowledgeCli.ts` is the executable source of truth for list, upsert, delete, repl, and sync commands.

## Core contract

- Answers should be grounded in indexed sources.
- Inline citations such as `[1]` must map cleanly to a visible sources list.
- If there is no relevant source, prefer a clear no-match outcome over unsupported claims.

## Key files

- `server/src/services/knowledgeBase.ts`
- `server/src/services/pineconeClient.ts`
- `server/src/services/geminiService.ts`
- `server/src/models/KnowledgeSource.ts`
- `server/knowledge/*.txt`

## Commands

- `cd server && npm run knowledge:list`
- `cd server && npm run knowledge:repl`
- `cd server && npm run knowledge:upsert -- --title "..." --file ./knowledge/file.txt --type profile --external-id stable-id`
- `cd server && npm run knowledge:sync -- --manifest ./knowledge/manifest.json`

## Reminders

- Preserve stable `externalId` values for repeatable updates.
- Report any source mutations explicitly.
