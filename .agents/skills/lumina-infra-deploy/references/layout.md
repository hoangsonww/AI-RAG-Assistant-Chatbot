# Infrastructure Layout

## Core deployment assets

- `docker-compose.yml`: local multi-service orchestration.
- `DEPLOYMENT.md`: deployment guidance.
- `docs/ADVANCED_DEPLOYMENTS.md`: advanced rollout patterns and deployment notes.

## Terraform

- `terraform/`: primary infrastructure-as-code tree.
- `terraform/modules/`: shared Terraform modules.

## Cloud-specific assets

- `aws/`: AWS-related materials outside Terraform.
- `agentic_ai/deployments/aws/`: Python service AWS deployment assets.
- `agentic_ai/deployments/azure/`: Python service Azure deployment assets.

## Working notes

- Touch only the platform or module implicated by the task.
- Keep documentation in sync when rollout behavior changes.
