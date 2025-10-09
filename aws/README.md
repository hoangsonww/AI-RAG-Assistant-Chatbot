# AWS Deployment Playbooks

This directory contains operational tooling for deploying the Lumina AI Assistant to AWS using the Terraform stack in `../terraform`. The scripts automate common lifecycle tasks such as building container images, publishing them to Amazon ECR, and applying the infrastructure changes described in the architecture documentation.

## Directory Structure

```
aws/
├── README.md              # This guide
└── scripts/
    ├── deploy-production.sh   # Build, push, and apply the production stack
    ├── plan.sh                # Generate a Terraform plan with environment safeguards
    └── destroy.sh             # Tear down the stack after confirmation
```

## Prerequisites

- Docker 20.x or newer
- AWS CLI v2 configured with a profile that has permissions for ECR, ECS, CloudWatch, and other infrastructure services
- Terraform >= 1.3 (the scripts call Terraform under the hood)
- The remote backend (S3 bucket + DynamoDB table) referenced in `terraform/main.tf`
- Valid ACM certificate ARN populated in `terraform.tfvars`

## Usage

All scripts are idempotent and include guard rails for production usage.

### 1. Deploy / Update

```
./scripts/deploy-production.sh
```

This command performs the following steps:

1. Validates that required tools are installed and the AWS profile/region are set.
2. Runs `terraform init` (if needed) and applies the module that provisions the Amazon ECR repositories.
3. Builds the frontend and backend images from the repository root and tags them using the configured ECR URLs.
4. Pushes the images to ECR.
5. Applies the full Terraform stack using `terraform apply`.

### 2. Plan

```
./scripts/plan.sh
```

Generates a read-only plan. The script ensures that a workspace/environment is passed and warns if you attempt to plan against `production` without explicit confirmation.

### 3. Destroy

```
./scripts/destroy.sh
```

Destroys the stack after a double confirmation prompt. Use this only for ephemeral environments because it will remove stateful services such as DocumentDB and ElastiCache.

## Environment Variables

The scripts respect the following variables:

- `AWS_PROFILE` – Profile to use with the AWS CLI and Terraform.
- `AWS_REGION` – Region for commands (defaults to the region defined in `terraform.tfvars`).
- `TF_WORKSPACE` – Terraform workspace to target (defaults to `default`).
- `LUMINA_IMAGE_TAG` – Optional override for the image tag applied to both frontend and backend images (defaults to `latest`).

You can export them before running any script, for example:

```bash
export AWS_PROFILE=prod
export AWS_REGION=us-east-1
export LUMINA_IMAGE_TAG=2024-05-01
```

## Operational Tips

- Keep `terraform.tfvars` encrypted or stored securely because it contains sensitive secrets.
- Run `terraform output` after deployment to retrieve connection endpoints and repository URLs.
- Subscribe to the SNS topic created by the Terraform monitoring module to receive operational alerts.

For more architectural context, review [`ARCHITECTURE.md`](../ARCHITECTURE.md) and [`terraform/README.md`](../terraform/README.md).
