# Lumina Repository Guide

## Scope

- This repository contains four major surfaces:
  - `client/`: React 18 + Vite + MUI + Framer Motion frontend.
  - `server/`: Express + TypeScript API, chat orchestration, MongoDB, Gemini, Pinecone, knowledge CLI.
  - `agentic_ai/`: Python multi-agent pipeline and MCP server.
  - `terraform/`, `aws/`, `docker-compose.yml`, `DEPLOYMENT.md`: infrastructure and deployment assets.

## Working rules

- Prefer the smallest-area change that solves the task.
- Do not edit generated artifacts unless the task explicitly requires rebuilding them.
  - Generated or compiled directories include `client/build/`, `server/dist/`, and `node_modules/`.
- Treat unrelated dirty files as user-owned. Do not revert or reorganize them.
- Preserve Lumina's existing product intent:
  - The frontend should remain polished, animated, and branded rather than generic.
  - Knowledge management should remain CLI-driven unless the user explicitly asks for a product change.
  - Grounded responses and inline citations must keep working when retrieval behavior changes.
- Update `openapi.yaml` when API request or response contracts change.
- Avoid touching `.env` files unless the user explicitly asks for environment changes.

## Validation defaults

- Frontend changes: run `npm run build` in `client/`.
- Backend changes: run `npm run build` in `server/`.
- Python `agentic_ai/` changes: prefer `python -m compileall agentic_ai`; only run runtime commands when dependencies and secrets are available.
- Infra changes: use the narrowest relevant validation such as `terraform validate`, `terraform fmt -check`, or `docker compose config`.
- Do not treat root, `client/`, or `server/` `npm test` scripts as authoritative. They are placeholder success commands in package scripts.

## Use project extensions

- Use the matching skill in `.claude/skills/` when the task is clearly about frontend UI, backend API behavior, RAG or knowledge operations, the Python agentic/MCP subsystem, infrastructure, review, or validation.
- Use the matching specialist subagent in `.claude/agents/` when the work is mostly isolated to one surface or when you want a review-style pass in separate context.

## Common commands

- Frontend dev: `cd client && npm run dev`
- Frontend build: `cd client && npm run build`
- Backend dev: `cd server && npm run dev`
- Backend build: `cd server && npm run build`
- Knowledge CLI: `cd server && npm run knowledge:list`, `knowledge:repl`, `knowledge:upsert`, `knowledge:delete`, `knowledge:sync`
- Python compile check: `python -m compileall agentic_ai`
- Python pipeline: `python -m agentic_ai run --task "..."`
- Python MCP server: `python -m agentic_ai server --config agentic_ai/config/production_config.yaml`
