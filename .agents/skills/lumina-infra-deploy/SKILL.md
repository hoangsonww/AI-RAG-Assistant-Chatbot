---
name: lumina-infra-deploy
description: Work on Lumina deployment and infrastructure assets. Use when editing terraform/, aws/, docker-compose.yml, DEPLOYMENT.md, docs/ADVANCED_DEPLOYMENTS.md, agentic_ai/deployments/, or other files related to Docker, Terraform, AWS or Azure rollout behavior, environment wiring, and release automation.
---

# Lumina Infra Deploy

## Overview

Use this skill for infrastructure and deployment changes. Keep edits scoped to the touched platform and avoid broad speculative rewrites across every deployment target.

## Load The Right Reference

- Read `references/layout.md` when locating the owning deployment files.
- Read `references/validation.md` before finishing so you use the narrowest relevant validation command.

## Change Only The Surface You Mean To Change

- Keep Terraform module changes localized when possible.
- Keep Docker changes aligned with the service they build or run.
- Keep deployment documentation in sync when behavior or rollout strategy changes.
- Preserve the repository's blue/green and canary deployment intent when adjusting infrastructure flows.

## Validate Conservatively

- Use `terraform validate`, `terraform fmt -check`, `docker compose config`, or another narrow tool appropriate to the files you changed.
- Prefer validating the smallest touched directory or service rather than the whole repository.
- If the required toolchain is unavailable, state what was not run.
