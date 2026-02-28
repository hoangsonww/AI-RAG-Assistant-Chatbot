# Server Guide

## Scope

- `server/src/routes/`: auth, conversations, chat, and guest endpoints.
- `server/src/services/`: Gemini, Pinecone, retrieval, and knowledge logic.
- `server/src/models/`: MongoDB persistence models.
- `server/src/scripts/knowledgeCli.ts`: CLI entry point for knowledge ingestion and maintenance.
- `server/knowledge/`: source content for indexed knowledge.

## Rules

- Keep route, service, model, and middleware responsibilities separated.
- Keep knowledge mutation CLI-driven unless the user explicitly requests a product change.
- Preserve the grounded-answer contract: retrieval should support inline citations and source lists, not unsupported claims.
- Update `openapi.yaml` whenever endpoint contracts change.
- Do not edit `server/dist/` by hand.

## Validation

- Primary validation: `npm run build`
- `npm test` is a placeholder package script.
- There are legacy `server/__tests__/*.js` files, but no reliable test runner is wired in the current package configuration. Do not claim they were exercised unless you explicitly set up and run them.
