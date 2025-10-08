# Terraform Infrastructure

This directory contains the production-ready Terraform configuration for deploying the Lumina AI Assistant on AWS. The stack follows the architecture documented in [`ARCHITECTURE.md`](../ARCHITECTURE.md) and provisions a fully managed environment with high availability, observability, and security best practices.

## What Gets Provisioned

The Terraform modules create the following components:

- **Networking**: A multi-AZ VPC with public and private subnets, internet gateway, NAT gateways, and VPC flow logs.
- **Container Runtime**: An ECS/Fargate cluster with distinct services for the frontend and backend, auto-scaling policies, CloudWatch logging, and ECS Exec support.
- **Load Balancing & CDN**: An internet-facing Application Load Balancer (ALB) with HTTPS termination, path-based routing, and a CloudFront distribution for global caching.
- **Data Stores**:
  - Amazon DocumentDB (MongoDB-compatible) cluster with multi-AZ replicas, audit/profiler logs, and connection string secret management.
  - Amazon ElastiCache for Redis with multi-AZ replication, encryption in transit and at rest.
- **Container Registry**: Dedicated Amazon ECR repositories for frontend and backend images with automated lifecycle policies.
- **Secrets Management**: AWS Secrets Manager secret that consolidates application credentials and connection strings for consumption by ECS tasks.
- **Monitoring & Alerting**: CloudWatch dashboards and alarms for ECS, ALB, DocumentDB, and ElastiCache with SNS email notifications.

## Prerequisites

- Terraform >= 1.3
- AWS CLI configured with credentials authorized to manage the required services
- Access to the S3 bucket and DynamoDB table configured for the remote backend
- An ACM certificate in `us-east-1` that covers both the frontend domain and backend subdomain
- Docker (optional) if you plan to build and push images using the provided scripts in `../aws/scripts`

## Usage

1. Copy the sample variable file and provide environment-specific values:
   ```bash
   cd terraform/
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your production parameters
   ```

2. Initialize the Terraform working directory:
   ```bash
   terraform init
   ```

3. Review the execution plan:
   ```bash
   terraform plan
   ```

4. Apply the infrastructure changes:
   ```bash
   terraform apply
   ```

5. After the first apply, build and push container images to the provisioned ECR repositories (see `../aws/scripts/deploy-production.sh`). Re-run `terraform apply` if you update image tags or infrastructure settings.

## Inputs & Outputs

All configurable inputs are documented in [`variables.tf`](variables.tf) with production-ready defaults. The most critical variables are the ACM certificate ARN, alert email address, and application secrets. Outputs include the ECR repository URLs, ALB DNS name, CloudFront distribution details, and connection endpoints for DocumentDB and Redis.

## State Management

A remote backend using Amazon S3 and DynamoDB is preconfigured. Ensure that the backend resources exist before running `terraform init`, or adjust the backend configuration to match your environment.

## Security Considerations

- Secrets are delivered to the backend service through AWS Secrets Manager and are never stored in plaintext in task definitions.
- Inbound access to DocumentDB and Redis is restricted to the ECS task security group.
- Deletion protection is enabled for DocumentDB by default to prevent accidental data loss.

## Cleaning Up

To tear down the environment, confirm that you no longer need the data and run:
```bash
terraform destroy
```

> **Important:** Destroying the stack will remove stateful services such as DocumentDB and Redis. Ensure that backups or snapshots are available before executing a destroy in production.
