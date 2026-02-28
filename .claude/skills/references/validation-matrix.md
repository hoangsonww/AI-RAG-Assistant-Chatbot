# Validation Matrix

## Frontend

- Changed files under `client/`
- Run: `cd client && npm run build`
- Note: `npm test` is a placeholder script

## Backend API or retrieval code

- Changed files under `server/`
- Run: `cd server && npm run build`
- Optional targeted runtime checks only when env and services are available
- Note: `npm test` is a placeholder script

## Knowledge source mutations

- Changed files under `server/knowledge/` or intentional CLI mutations
- If code changed, run: `cd server && npm run build`
- Report the exact knowledge command executed and affected source IDs or external IDs

## Python agentic subsystem

- Changed files under `agentic_ai/`
- Run: `python -m compileall agentic_ai`
- Optional runtime checks: `python -m agentic_ai visualize` or `python -m agentic_ai run --task "..."`

## Infrastructure

- Changed files under `terraform/`, `aws/`, `agentic_ai/deployments/`, `docker-compose.yml`
- Run only the relevant checks:
  - `terraform fmt -check`
  - `terraform validate`
  - `docker compose config`
