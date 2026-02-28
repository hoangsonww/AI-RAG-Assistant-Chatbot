---
name: lumina-rag-knowledge
description: Manage Lumina's retrieval-augmented generation and knowledge ingestion workflow. Use when editing server/src/services/knowledgeBase.ts, server/src/services/pineconeClient.ts, server/src/scripts/knowledgeCli.ts, server/src/models/KnowledgeSource.ts, files under server/knowledge, manifest-based sync inputs, or debugging grounded answers, retrieval relevance, source lifecycle, and inline citations.
---

# Lumina Rag Knowledge

## Overview

Use this skill for retrieval, ingestion, and citation work. The repository treats knowledge management as a CLI-driven flow rather than a UI-managed feature.

## Load The Right Reference

- Read `references/cli-workflow.md` when updating or using ingestion commands, manifests, or source files.
- Read `references/retrieval-contract.md` when changing runtime retrieval, citation formatting, or grounded-answer behavior.

## Preserve The Grounding Contract

- Keep answers grounded in indexed sources.
- Preserve inline citations and the associated sources list behavior when changing retrieval or response composition.
- Avoid adding UI-based mutation flows for knowledge content unless the task explicitly requires a product change.
- Prefer updating source content through the CLI and manifest workflows already documented in the repo.

## Change Source Lifecycle Carefully

- Preserve stable `externalId` usage when designing repeatable updates.
- Keep ingestion, deletion, listing, and sync semantics coherent across CLI commands and model storage.
- If a change affects both retrieval logic and general API behavior, coordinate with `lumina-backend-api`.

## Finish With Practical Validation

- Run `npm run build` in `server/` after code changes.
- Use the existing CLI commands for targeted runtime checks when environment variables and external services are available.
- If Pinecone or Gemini credentials are unavailable, state that runtime retrieval was not exercised.
