---
name: knowledge-ops
description: Use when explicitly asked to add, edit, delete, list, or sync indexed knowledge sources for Lumina through the CLI under server/. This skill has side effects and should be invoked intentionally.
disable-model-invocation: true
---

# Knowledge Ops

Use this skill only for explicit source maintenance tasks.

## First read

- `@server/CLAUDE.md`
- `@RAG.md`
- `@.claude/skills/references/rag-workflow.md`

## Workflow

1. Work from `server/`.
2. Prefer the existing CLI:
   - `npm run knowledge:list`
   - `npm run knowledge:repl`
   - `npm run knowledge:upsert -- ...`
   - `npm run knowledge:delete -- ...`
   - `npm run knowledge:sync -- ...`
3. Preserve stable `--external-id` values for repeatable updates.
4. Prefer manifest-based sync for multi-source updates.
5. Confirm before mutating or deleting indexed content unless the user already asked for the exact change.

## Validation

- If code changed, run `cd server && npm run build`.
- If data changed, report what command ran and what source identifiers were affected.

## Common traps

- Do not invent a UI-based ingestion path for a CLI-managed workflow.
- Do not silently replace unrelated sources when a narrow upsert would do.
