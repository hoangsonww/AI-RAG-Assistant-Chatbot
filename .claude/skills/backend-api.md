---
name: backend-api
description: Use when changing the Express and TypeScript backend in server/, including auth, conversations, guest flows, chat routes, middleware, models, API contracts, Gemini integration, or non-ingestion backend behavior.
---

# Backend API

Use this skill for HTTP and service-layer work in `server/`.

## First read

- `@server/CLAUDE.md`
- `@.claude/skills/references/backend-map.md`

## Workflow

1. Start with the route that exposes the behavior.
2. Trace into services, middleware, models, and utilities before editing.
3. Keep route handlers thin where possible and avoid smearing business logic across unrelated files.
4. Preserve separate handling for authenticated and guest conversation paths when the repo already separates them.
5. Update `openapi.yaml` when request or response contracts change.
6. Coordinate with the frontend when payload shape or route semantics change.

## Validation

- Run `cd server && npm run build`.
- If external services are unavailable, distinguish compile-time validation from runtime confidence.

## Common traps

- `server/dist/` is generated output.
- The package `npm test` script is a placeholder success script.
