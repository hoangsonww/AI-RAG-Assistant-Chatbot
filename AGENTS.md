# Lumina Codex Guide

## Repository Scope

- This repository combines a React and Vite frontend in `client/`, an Express and TypeScript backend in `server/`, a Python multi-agent and MCP subsystem in `agentic_ai/`, plus deployment assets in `terraform/`, `aws/`, `docker-compose.yml`, and `agentic_ai/deployments/`.
- Prefer the smallest-area change that solves the task. Avoid repository-wide formatting or incidental refactors unless the user asks for them.
- Treat unrelated dirty files as user-owned. Do not revert or reorganize them.

## Working Rules

- Read the local skill in `.agents/skills/` when the task clearly matches frontend UI work, backend API work, RAG or knowledge workflows, the Python agentic and MCP subsystem, or deployment and infrastructure changes.
- Use `README.md`, `ARCHITECTURE.md`, `RAG.md`, `DEPLOYMENT.md`, and `openapi.yaml` as the primary repo references before making broad changes.
- Preserve Lumina's existing personality on the frontend. Do not flatten the UI into generic boilerplate when editing landing or chat surfaces.
- Keep knowledge management CLI-driven unless the user explicitly requests a product change. Preserve grounded answers and citations.
- Update `openapi.yaml` when API request or response contracts change.

## Validation

- Frontend changes: run `npm run build` in `client/`.
- Backend changes: run `npm run build` in `server/`.
- RAG or knowledge changes: run `npm run build` in `server/` and use targeted knowledge CLI checks only when the required environment variables and services are available.
- Python `agentic_ai/` changes: prefer `python -m compileall agentic_ai`; run targeted runtime checks only when dependencies are installed.
- Infra changes: use the narrowest relevant validation such as `terraform validate`, `terraform fmt -check`, or `docker compose config`.
- Root, client, and server `npm test` scripts are placeholder success commands. Do not treat them as meaningful test coverage.

## Common Commands

- Frontend dev server: `npm run dev` in `client/`
- Backend dev server: `npm run dev` in `server/`
- Frontend build: `npm run build` in `client/`
- Backend build: `npm run build` in `server/`
- Knowledge CLI: `npm run knowledge:repl`, `npm run knowledge:list`, `npm run knowledge:upsert`, `npm run knowledge:delete`, `npm run knowledge:sync` in `server/`
- Python pipeline: `python -m agentic_ai run --task "..."`, `python -m agentic_ai visualize`, `python -m agentic_ai server --config agentic_ai/config/production_config.yaml`
