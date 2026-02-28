# Knowledge CLI Workflow

## Key files

- `server/src/scripts/knowledgeCli.ts`: source of truth for the CLI commands.
- `server/src/models/KnowledgeSource.ts`: knowledge source persistence model.
- `server/knowledge/`: text sources and manifest inputs.
- `RAG.md`: repository-level usage notes.

## Primary commands

Run from `server/`:

```bash
npm run knowledge:repl
npm run knowledge:list
npm run knowledge:upsert -- --title "Title" --file ./knowledge/file.txt --type resume --external-id "stable-id"
npm run knowledge:delete -- --id <sourceId>
npm run knowledge:sync -- --manifest ./knowledge/manifest.json
```

## Working notes

- Use a stable `--external-id` for repeatable updates.
- Prefer manifest-based sync for multiple sources.
- Keep knowledge edits CLI-only unless the task explicitly introduces a product change.
- Treat `server/.env` as required for live ingestion and retrieval checks.
