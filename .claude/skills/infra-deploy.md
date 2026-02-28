---
name: infra-deploy
description: Use when changing Terraform, Docker, AWS or Azure deployment assets, or deployment documentation, including terraform/, aws/, docker-compose.yml, DEPLOYMENT.md, docs/ADVANCED_DEPLOYMENTS.md, and agentic_ai/deployments/.
---

# Infra Deploy

Use this skill for infrastructure and deployment work.

## First read

- `@terraform/CLAUDE.md`
- `@DEPLOYMENT.md`
- `@.claude/skills/references/infra-map.md`

## Workflow

1. Identify the owning platform or module before editing.
2. Keep changes localized to the affected deployment surface.
3. Preserve progressive delivery, blue-green, and canary intent when changing rollout logic.
4. Synchronize docs when deployment behavior changes materially.

## Validation

- Use the narrowest relevant command:
  - `terraform fmt -check`
  - `terraform validate`
  - `docker compose config`
- State clearly when toolchain or cloud credentials prevented deeper validation.
