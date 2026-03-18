# Lumina Codex Guide

## Repository Overview

Lumina is a full-stack AI-powered chatbot with RAG, a standalone MCP server, and a multi-agent pipeline:

- **`client/`** — React 18 + Vite + MUI + Framer Motion frontend with branded chat UI, markdown/math rendering, and SSE streaming.
- **`server/`** — Express + TypeScript API handling auth, conversations, chat, Gemini AI, Pinecone vector search, and knowledge CLI.
- **`mcp_server/`** — Standalone Model Context Protocol server with 32 tools, 7 resources, 6 prompts across 8 categories.
- **`agentic_ai/`** — Python multi-agent LangGraph pipeline with MCP client integration for tool-augmented autonomous execution.
- **`terraform/`**, **`aws/`**, **`docker-compose.yml`** — Infrastructure, deployment, and orchestration assets.

## Scope Rules

- Prefer the smallest-area change that solves the task.
- Do not perform repository-wide formatting or incidental refactors unless explicitly asked.
- Treat unrelated dirty files as user-owned. Do not revert or reorganize them.
- Do not edit generated artifacts (`client/build/`, `server/dist/`, `node_modules/`).
- Avoid touching `.env` files unless the user explicitly asks for environment changes.

## Working Rules

- Read the matching skill in `.agents/skills/` when the task clearly maps to a subsystem:
  - `lumina-frontend-ui` for React/Vite frontend work.
  - `lumina-backend-api` for Express backend and API work.
  - `lumina-rag-knowledge` for RAG, knowledge ingestion, and citation work.
  - `lumina-agentic-mcp` for Python pipeline and MCP client work.
  - `lumina-mcp-server` for standalone MCP server development.
  - `lumina-infra-deploy` for Terraform, Docker, and deployment work.
- Use `README.md`, `ARCHITECTURE.md`, `RAG.md`, `DEPLOYMENT.md`, and `openapi.yaml` as primary references before broad changes.
- Preserve Lumina's branded frontend personality — do not flatten into generic boilerplate.
- Keep knowledge management CLI-driven unless the user explicitly requests a product change.
- Preserve grounded answers and inline citations when modifying retrieval behavior.
- Update `openapi.yaml` when API request or response contracts change.
- MCP tool names and input schemas are external contracts — rename carefully.

## Validation Commands

| Surface | Command | Notes |
|---------|---------|-------|
| Frontend | `cd client && npm run build` | TypeScript compilation and Vite build |
| Backend | `cd server && npm run build` | TypeScript compilation |
| Python pipeline | `python -m compileall agentic_ai` | Bytecode compilation check |
| MCP server | `python -m compileall mcp_server` | Bytecode compilation check |
| Terraform | `cd terraform && terraform validate` | HCL syntax validation |
| Docker | `docker compose config` | Compose file syntax check |

> **Note:** `npm test` scripts in root, `client/`, and `server/` are placeholder commands. Do not treat as meaningful test coverage.

## Common Commands

```bash
# Frontend
cd client && npm run dev          # dev server
cd client && npm run build        # production build

# Backend
cd server && npm run dev          # dev server with nodemon
cd server && npm run build        # production build

# Knowledge CLI (from server/)
npm run knowledge:repl            # interactive REPL
npm run knowledge:list            # list sources
npm run knowledge:upsert          # ingest content
npm run knowledge:delete          # remove source
npm run knowledge:sync            # manifest-based sync

# Python pipeline
python -m agentic_ai run --task "..."    # run pipeline
python -m agentic_ai visualize          # visualize graph

# MCP server
python -m mcp_server                           # stdio transport
python -m mcp_server --transport sse --port 8080  # SSE transport
python -m mcp_server --config mcp_server/config/production.yaml
```

## Custom Agents

Specialized Codex agents are defined in `.codex/agents/`:

| Agent | Focus |
|-------|-------|
| `explorer` | Read-only codebase exploration and evidence gathering |
| `reviewer` | Code review for correctness, security, and regressions |
| `frontend_dev` | React/Vite frontend development in `client/` |
| `backend_dev` | Express/TypeScript backend development in `server/` |
| `python_dev` | Python pipeline and MCP server development |
| `infra_eng` | Terraform, Docker, and deployment infrastructure |
| `rag_specialist` | RAG knowledge ingestion, retrieval, and citations |
| `mcp_dev` | Standalone MCP server tool development |
