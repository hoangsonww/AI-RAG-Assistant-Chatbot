---
name: lumina-frontend-ui
description: Build, refine, and debug the React/Vite frontend for Lumina. Use when editing files under client/src or client/package.json, changing chat UX, landing page content, auth flows, routing, theme behavior, markdown rendering, animations, responsive layout, or frontend API wiring.
---

# Lumina Frontend UI

## Overview

Use this skill for frontend tasks in `client/`. Keep changes aligned with Lumina's existing visual language: animated, polished, content-rich, and responsive rather than generic dashboard UI.

## Load The Right Reference

- Read `references/component-map.md` before editing when you need to locate the right page, component, or client-side service.
- Read `references/validation.md` before finishing when frontend behavior, build health, or API coupling changed.

## Work The Frontend Deliberately

- Start from the user-facing entry point, then trace inward. For chat issues this usually means `client/src/pages/Home.tsx` plus `client/src/components/ChatArea.tsx` and `client/src/services/api.ts`.
- Keep route-level changes consistent with `client/src/App.tsx`.
- Prefer focused edits to the page or component that owns the behavior instead of broad global rewrites.
- Treat `client/src/pages/LandingPage.tsx` as intentionally branded and heavily customized. Preserve its personality unless the task explicitly asks for a redesign.
- Keep responsive behavior intact on mobile and desktop.
- Keep markdown, math, and citation rendering working when changing chat output.

## Coordinate With The Backend Carefully

- If a frontend change depends on a new request shape, endpoint, or response contract, update the backend and `openapi.yaml` in the same task when feasible.
- If the bug is really caused by retrieval, citations, or chat response composition, switch to `lumina-rag-knowledge` or `lumina-backend-api` instead of forcing a frontend-only patch.

## Finish With Real Validation

- Run `npm run build` in `client/` after meaningful frontend changes.
- Treat `npm test` in `client/` as a placeholder, not as evidence of coverage.
- Call out any unverified browser behavior if you could not run the app interactively.
