# Lumina Codex Guide

## Repository Overview

Lumina is a full-stack AI assistant with four major surfaces:

- `client/`: React 18 + Vite + MUI + Framer Motion frontend
- `server/`: Express + TypeScript API with MongoDB, Gemini, Pinecone, and knowledge CLI
- `agentic_ai/`: Python multi-agent pipeline with MCP client integration
- `mcp_server/`: Standalone MCP server with 32 tools, 7 resources, 6 prompts
- `terraform/`, `aws/`, `docker-compose.yml`: Infrastructure and deployment

## Working Agreements

- Prefer the smallest-area change that solves the task.
- Treat unrelated dirty files as user-owned; do not revert or reorganize them.
- Preserve Lumina's branded, animated frontend personality.
- Keep knowledge management CLI-driven unless explicitly asked to change.
- Update `openapi.yaml` when API contracts change.
- MCP tool names and schemas are external contracts — rename carefully.

## Validation Commands

| Surface | Command | Notes |
|---------|---------|-------|
| Frontend | `cd client && npm run build` | Primary validation |
| Backend | `cd server && npm run build` | Primary validation |
| Python | `python -m compileall agentic_ai` | Low-risk compile check |
| MCP Server | `python -m compileall mcp_server` | Low-risk compile check |
| Terraform | `terraform validate` | Use in `terraform/` |
| Docker | `docker compose config` | Syntax validation only |

**Important:** `npm test` scripts in root, client, and server are placeholders. Do not treat as real coverage.

## Key References

- `README.md`, `ARCHITECTURE.md`, `RAG.md`, `DEPLOYMENT.md`, `openapi.yaml`
- `mcp_server/README.md` for MCP tool reference
- `agentic_ai/README.md` for pipeline architecture
