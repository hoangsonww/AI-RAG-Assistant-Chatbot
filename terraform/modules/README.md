# Terraform Modules

This directory contains reusable Terraform modules for deploying and managing the Lumina AI Assistant infrastructure.

## Available Modules

### Core Infrastructure

#### 1. VPC Module (`vpc/`)
- Multi-AZ VPC setup with public and private subnets
- NAT gateways for private subnet internet access
- VPC Flow Logs for network monitoring
- Configurable CIDR blocks

#### 2. ALB Module (`alb/`)
- Application Load Balancer with HTTPS termination
- HTTP to HTTPS redirect
- Path-based routing for frontend and backend
- Health checks and deletion protection

#### 3. ECR Module (`ecr/`)
- Container registries for frontend and backend
- Automated image scanning
- Lifecycle policies for image cleanup
- KMS encryption

#### 4. ECS Module (`ecs/`)
- Fargate cluster with Container Insights
- Separate services for frontend and backend
- Auto-scaling based on CPU/memory
- CloudWatch logging

#### 5. DocumentDB Module (`documentdb/`)
- MongoDB-compatible database cluster
- Multi-AZ deployment
- Automated backups
- TLS encryption

#### 6. ElastiCache Module (`elasticache/`)
- Redis replication group
- Automatic failover
- Multi-AZ deployment
- Encryption at rest and in transit

#### 7. CloudFront Module (`cloudfront/`)
- CDN distribution
- Custom SSL certificates
- Origin access to ALB
- Access logging

#### 8. Monitoring Module (`monitoring/`)
- CloudWatch alarms for services
- SNS notifications
- CloudWatch Dashboard
- Metrics for CPU, memory, errors

### Advanced Deployment Modules

#### 9. CodeDeploy Module (`codedeploy/`) ⭐ NEW
**Purpose:** Blue/Green deployments for ECS services

**Features:**
- Automated blue/green deployments
- Traffic shifting with validation
- Automated rollback on failures
- Integration with CloudWatch alarms
- SNS notifications for deployment events
- S3 bucket for deployment artifacts

**Usage:**
```hcl
module "codedeploy" {
  source = "./modules/codedeploy"

  project_name = var.project_name
  environment  = var.environment

  ecs_cluster_name = module.ecs.cluster_name

  frontend_service_name = module.ecs.frontend_service_name
  backend_service_name  = module.ecs.backend_service_name

  frontend_listener_arn = module.alb.frontend_listener_arn
  backend_listener_arn  = module.alb.backend_listener_arn

  frontend_blue_target_group_name  = module.alb.frontend_blue_tg_name
  frontend_green_target_group_name = module.alb.frontend_green_tg_name
  backend_blue_target_group_name   = module.alb.backend_blue_tg_name
  backend_green_target_group_name  = module.alb.backend_green_tg_name

  notification_email = "ops@yourdomain.com"
}
```

#### 10. Canary Deployment Module (`canary-deployment/`) ⭐ NEW
**Purpose:** Progressive traffic shifting with automated health checks

**Features:**
- Configurable traffic stages (e.g., 10% → 25% → 50% → 100%)
- Health check validation at each stage
- Automated rollback on failures
- Lambda function for traffic shifting
- DynamoDB for deployment state tracking
- CloudWatch dashboard for canary monitoring

**Usage:**
```hcl
module "canary_backend" {
  source = "./modules/canary-deployment"

  project_name = var.project_name
  environment  = var.environment
  service_name = "backend"
  aws_region   = var.aws_region

  vpc_id       = module.vpc.vpc_id
  service_port = 5000

  listener_arn                = module.alb.backend_listener_arn
  alb_arn_suffix             = module.alb.alb_arn_suffix
  production_target_group_arn = module.alb.backend_tg_arn

  canary_traffic_stages   = [10, 25, 50, 75, 100]
  stage_duration_minutes  = 10
  enable_auto_progression = true
  auto_rollback_enabled   = true

  error_rate_threshold = 10
  latency_threshold    = 1.0

  alert_email = "ops@yourdomain.com"
}
```

#### 11. Progressive Delivery Module (`progressive-delivery/`) ⭐ NEW
**Purpose:** End-to-end deployment pipeline with validation gates

**Features:**
- AWS Step Functions state machine
- Multi-stage validation (pre-deployment, metrics, health)
- Automated promotion decisions
- Integration with canary deployments
- DynamoDB for pipeline state
- EventBridge for automatic triggering
- Comprehensive error handling and rollback

**Usage:**
```hcl
module "progressive_delivery" {
  source = "./modules/progressive-delivery"

  project_name = var.project_name
  environment  = var.environment

  canary_stabilization_period = 300  # 5 minutes
  stage_duration             = 600   # 10 minutes
  traffic_stages             = [10, 25, 50, 75, 100]

  error_rate_threshold     = 1.0   # 1%
  latency_threshold        = 1.0   # 1 second
  success_rate_threshold   = 99.0  # 99%

  notification_email = "ops@yourdomain.com"

  enable_automatic_execution = true  # Trigger on ECR push
}
```

#### 12. Feature Flags Module (`feature-flags/`) ⭐ NEW
**Purpose:** Runtime feature toggles using AWS AppConfig

**Features:**
- AWS AppConfig for configuration management
- Percentage-based rollouts
- Rule-based targeting (user attributes, regions, etc.)
- Lambda function for flag evaluation
- API Gateway for flag queries
- DynamoDB for evaluation tracking
- Canary deployment strategy for flag changes

**Usage:**
```hcl
module "feature_flags" {
  source = "./modules/feature-flags"

  project_name = var.project_name
  environment  = var.environment

  deployment_duration_minutes = 20
  growth_factor              = 10  # 10% per interval
  bake_time_minutes          = 10

  allowed_origins = ["https://yourdomain.com"]
  alert_email     = "ops@yourdomain.com"
}
```

#### 13. Deployment Monitoring Module (`deployment-monitoring/`) ⭐ NEW
**Purpose:** Comprehensive monitoring and observability for deployments

**Features:**
- CloudWatch dashboards (Deployment Overview, DORA Metrics)
- Custom metrics publishing
- Deployment frequency tracking
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate
- CloudWatch alarms for deployment health
- Log Insights queries for deployment analysis

**Usage:**
```hcl
module "deployment_monitoring" {
  source = "./modules/deployment-monitoring"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  failure_rate_threshold        = 10  # 10%
  deployment_duration_threshold = 60  # 60 minutes

  alert_email = "ops@yourdomain.com"
}
```

## Module Structure

Each module follows this structure:

```
module-name/
├── main.tf          # Main resource definitions
├── variables.tf     # Input variables
├── outputs.tf       # Output values
├── README.md        # Module documentation (optional)
└── lambda/          # Lambda functions (if applicable)
    └── *.py
```

## Quick Start Guide

### 1. Deploy Core Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Configure your terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

### 2. Add Advanced Deployment Capabilities

Add to your `main.tf`:

```hcl
# Blue/Green Deployments
module "codedeploy" {
  source = "./modules/codedeploy"
  # ... configuration
}

# Canary Deployments
module "canary_frontend" {
  source = "./modules/canary-deployment"
  service_name = "frontend"
  # ... configuration
}

module "canary_backend" {
  source = "./modules/canary-deployment"
  service_name = "backend"
  # ... configuration
}

# Progressive Delivery
module "progressive_delivery" {
  source = "./modules/progressive-delivery"
  # ... configuration
}

# Feature Flags
module "feature_flags" {
  source = "./modules/feature-flags"
  # ... configuration
}

# Deployment Monitoring
module "deployment_monitoring" {
  source = "./modules/deployment-monitoring"
  # ... configuration
}
```

### 3. Deploy Changes

```bash
terraform plan
terraform apply
```

## Deployment Strategies Comparison

| Feature | CodeDeploy (Blue/Green) | Canary Deployment | Progressive Delivery |
|---------|------------------------|-------------------|---------------------|
| **Traffic Shift** | Instant (0% → 100%) | Gradual (stages) | Multi-stage with gates |
| **Validation** | Basic health checks | Health + metrics | Comprehensive validation |
| **Rollback** | Manual/Automatic | Automatic | Automatic |
| **Complexity** | Medium | Medium | High |
| **Best For** | Major releases | Regular releases | Critical changes |
| **Orchestration** | CodeDeploy | Lambda + EventBridge | Step Functions |

## Deployment Scripts

The project includes automated deployment scripts:

### Blue/Green Deployment
```bash
./aws/scripts/deploy-blue-green.sh \
  --service backend \
  --environment production \
  --image-tag v1.2.0
```

### Canary Deployment
```bash
./aws/scripts/deploy-canary.sh \
  --service backend \
  --stages 10,25,50,75,100 \
  --stage-duration 10
```

### Orchestrated Deployment
```bash
./aws/scripts/orchestrate-deployment.sh \
  --strategy progressive \
  --service backend \
  --environment production
```

## Monitoring

### CloudWatch Dashboards

Access dashboards in the AWS Console:

1. **Deployment Overview**: `<project-name>-deployment-overview-<environment>`
2. **DORA Metrics**: `<project-name>-dora-metrics-<environment>`
3. **Canary Monitoring**: `<project-name>-<service>-canary-<environment>`

### Custom Metrics

Namespace: `<project-name>/Deployments`

Key metrics:
- `DeploymentCount`
- `SuccessfulDeployments`
- `FailedDeployments`
- `DeploymentDuration`
- `RollbackCount`
- `LeadTime`

### Alerts

SNS topics are configured for:
- Deployment failures
- High error rates
- Performance degradation
- Rollback events

## Best Practices

1. **Always use version tags** for Docker images (not `latest`)
2. **Enable auto-rollback** for production deployments
3. **Monitor dashboards** during deployments
4. **Use canary deployments** for regular releases
5. **Use blue/green** for major version changes
6. **Test in staging** before production
7. **Set up SNS notifications** for deployment events
8. **Review DORA metrics** regularly

## Troubleshooting

### Common Issues

**Issue:** Module not found
```bash
# Solution: Initialize Terraform
terraform init -upgrade
```

**Issue:** Deployment fails
```bash
# Check logs
aws logs tail /aws/codedeploy/<project>/<env> --follow

# Review deployment details
aws deploy get-deployment --deployment-id <id>
```

**Issue:** High failure rate
```bash
# Check CloudWatch dashboard
# Review recent changes
# Consider rolling back
```

## Documentation

- [Advanced Deployments Guide](../docs/ADVANCED_DEPLOYMENTS.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [AWS Deployment README](../aws/README.md)

## Support

For issues or questions:
1. Check module documentation
2. Review CloudWatch Logs
3. Check CloudWatch Dashboards
4. Consult AWS documentation

---

**Last Updated:** January 2025
