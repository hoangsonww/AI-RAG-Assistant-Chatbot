# Client Guide

## Scope

- `client/src/pages/`: route-level surfaces including `LandingPage.tsx`, `Home.tsx`, auth pages, terms, and 404.
- `client/src/components/`: shared UI such as `ChatArea.tsx`, `Sidebar.tsx`, `Navbar.tsx`.
- `client/src/services/api.ts`: client/server API wiring.
- `client/src/theme.ts`, `client/src/globals.css`, `client/src/styles/`: shared visual system.

## Rules

- Preserve the existing branded, motion-heavy Lumina UI instead of replacing it with generic app-shell patterns.
- Keep chat markdown, math, and source citation rendering intact when editing `ChatArea.tsx`.
- Prefer focused edits to the page or component that owns the behavior rather than broad theme-wide rewrites.
- When changing request or response shapes, coordinate with `server/` and `openapi.yaml`.
- Do not edit `client/build/` by hand.

## Validation

- Primary validation: `npm run build`
- The `npm test` script is a placeholder and does not provide meaningful coverage.
