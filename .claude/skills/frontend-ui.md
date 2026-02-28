---
name: frontend-ui
description: Use when changing the React and Vite frontend in client/, including LandingPage, Home chat UX, auth pages, Navbar, Sidebar, ChatArea, theme, markdown rendering, responsiveness, animation, or client-side API integration.
---

# Frontend UI

Use this skill for work centered in `client/`.

## First read

- `@client/CLAUDE.md`
- `@.claude/skills/references/frontend-map.md`

## Workflow

1. Start from the user-facing entry point, then trace inward.
2. Keep layout, motion, and typography aligned with Lumina's existing branded style.
3. Prefer focused edits in the owning page or component instead of broad rewrites.
4. Preserve markdown, math, and citation rendering in chat responses.
5. If the change requires a new API contract, update the backend and `openapi.yaml` in the same task when feasible.

## Validation

- Run `cd client && npm run build`.
- Call out any browser behavior you could not verify interactively.

## Common traps

- `client/build/` is generated output, not source of truth.
- The `npm test` script in `client/package.json` is a placeholder success script.
