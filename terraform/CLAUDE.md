# Terraform Guide

## Scope

- `terraform/main.tf`, `variables.tf`, `terraform.tfvars.example`: root orchestration.
- `terraform/modules/`: ALB, ECS, CloudFront, monitoring, feature flags, progressive delivery, canary deployment, and other infrastructure modules.

## Rules

- Touch only the affected module or root wiring implicated by the task.
- Preserve the repository's progressive delivery intent when changing rollout infrastructure.
- Keep deployment docs synchronized when behavior changes materially.

## Validation

- Use the narrowest possible validation:
  - `terraform fmt -check`
  - `terraform validate`
- Do not run broad apply-like commands unless explicitly asked.
