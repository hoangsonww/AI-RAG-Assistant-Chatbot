---
name: lumina-backend-api
description: Implement and debug the Express and TypeScript backend for Lumina. Use when editing files under server/src or server/package.json, changing authentication, conversations, guest flows, chat routes, models, middleware, API contracts, or Gemini and Pinecone service wiring outside the dedicated knowledge-ingestion workflow.
---

# Lumina Backend Api

## Overview

Use this skill for HTTP and data-layer work in `server/`. Follow the existing route, middleware, model, and service split instead of collapsing logic into a single file.

## Load The Right Reference

- Read `references/file-map.md` to locate the route, service, or model that owns a behavior.
- Read `references/validation.md` before finishing when request contracts, persistence logic, or API docs changed.

## Change Backend Behavior In The Existing Layers

- Start with the route that exposes the behavior, then trace into services, models, middleware, and utility functions.
- Keep authentication logic in auth routes or middleware rather than scattering token checks.
- Keep conversation and guest behavior separate when the repository already separates those flows.
- Keep request and response structures stable unless the task explicitly changes the API contract.

## Handle Contract Changes Explicitly

- Update `openapi.yaml` when endpoint behavior, payload fields, or response shapes change.
- If the work is really about knowledge ingestion, Pinecone source lifecycle, or citation formatting, switch to `lumina-rag-knowledge`.
- If frontend callers depend on the changed contract, update the client in the same task when feasible.

## Finish With Real Validation

- Run `npm run build` in `server/` after meaningful backend changes.
- Treat `npm test` in `server/` as a placeholder, not as evidence of correctness.
- If live services or secrets were unavailable, state that clearly and separate compile-time validation from runtime confidence.
