# Advanced Deployment Strategies Guide

This guide covers the advanced deployment strategies and CI/CD enhancements available in the Lumina AI Assistant project.

## Table of Contents

1. [Overview](#overview)
2. [Deployment Strategies](#deployment-strategies)
3. [Blue/Green Deployments](#bluegreen-deployments)
4. [Canary Deployments](#canary-deployments)
5. [Progressive Delivery](#progressive-delivery)
6. [Feature Flags](#feature-flags)
7. [Monitoring & Observability](#monitoring--observability)
8. [Automated Rollback](#automated-rollback)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The project now supports multiple advanced deployment strategies that enable:

- **Zero-downtime deployments** with blue/green switching
- **Gradual rollouts** with canary deployments
- **Automated validation** and rollback
- **Feature flags** for controlled feature releases
- **Comprehensive monitoring** with DORA metrics
- **Progressive delivery** pipelines with AWS Step Functions

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Load Balancer                    │
│                      (Traffic Distribution)                      │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
    ┌───────────▼───────────┐       ┌───────────▼───────────┐
    │   Blue Environment    │       │  Green Environment    │
    │  (Current Version)    │       │   (New Version)       │
    └───────────────────────┘       └───────────────────────┘
                │                                 │
                └──────────┬──────────────────────┘
                           │
                ┌──────────▼──────────┐
                │   Canary Traffic    │
                │  (Progressive %)    │
                └─────────────────────┘
```

## Deployment Strategies

### Strategy Comparison

| Strategy | Use Case | Traffic Shift | Rollback Speed | Complexity |
|----------|----------|---------------|----------------|------------|
| **Blue/Green** | Major releases | Instant (0% → 100%) | Instant | Medium |
| **Canary** | Gradual rollouts | Progressive (10% → 100%) | Fast | Medium |
| **Progressive** | Critical changes | Multi-stage validation | Automatic | High |
| **Feature Flags** | Feature toggles | User-based | Instant | Low |

### When to Use Each Strategy

**Blue/Green:**
- Major version updates
- Database schema changes
- Infrastructure updates
- When you need instant rollback capability

**Canary:**
- Regular feature releases
- Performance optimizations
- Bug fixes
- When you want gradual validation

**Progressive Delivery:**
- Mission-critical changes
- Compliance-sensitive updates
- Multi-region deployments
- When you need automated validation gates

**Feature Flags:**
- A/B testing
- Beta feature releases
- User-specific features
- When you need runtime control

## Blue/Green Deployments

Blue/Green deployments provide instant traffic switching between two identical environments.

### Setup

1. **Deploy CodeDeploy Module:**

```bash
cd terraform
terraform init

# Add to your main.tf:
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

  tags = var.tags
}

terraform apply
```

2. **Execute Blue/Green Deployment:**

```bash
# Deploy with blue/green strategy
./aws/scripts/deploy-blue-green.sh \
  --service backend \
  --environment production \
  --image-tag v1.2.0

# Deploy both services
./aws/scripts/deploy-blue-green.sh \
  --service both \
  --environment production \
  --image-tag v1.2.0
```

### Configuration Options

```bash
# Environment variables
export DEPLOYMENT_DESCRIPTION="Release v1.2.0 - New chat features"
export WAIT_FOR_COMPLETION=true
export AWS_REGION=us-east-1

# Execute deployment
./aws/scripts/deploy-blue-green.sh --service backend
```

### Deployment Process

1. **Pre-deployment:** Validate environment and build new version
2. **Green Deployment:** Deploy new version to green environment
3. **Testing:** Optionally test green environment on test port
4. **Traffic Switch:** Instantly switch 100% traffic to green
5. **Blue Termination:** Wait 5 minutes, then terminate blue environment

## Canary Deployments

Canary deployments gradually shift traffic to the new version with automated health checks.

### Setup

1. **Deploy Canary Module:**

```bash
module "canary_backend" {
  source = "./modules/canary-deployment"

  project_name = var.project_name
  environment  = var.environment
  service_name = "backend"
  aws_region   = var.aws_region

  vpc_id       = module.vpc.vpc_id
  service_port = 5000

  listener_arn               = module.alb.backend_listener_arn
  alb_arn_suffix            = module.alb.alb_arn_suffix
  production_target_group_arn = module.alb.backend_tg_arn

  # Canary configuration
  canary_traffic_stages = [10, 25, 50, 75, 100]
  stage_duration_minutes = 10
  enable_auto_progression = true
  auto_rollback_enabled   = true

  # Health thresholds
  error_rate_threshold = 10
  latency_threshold    = 1.0

  alert_email = "ops@yourdomain.com"

  tags = var.tags
}
```

2. **Execute Canary Deployment:**

```bash
# Start canary deployment with default stages (10%, 25%, 50%, 75%, 100%)
./aws/scripts/deploy-canary.sh \
  --service backend \
  --environment production \
  --image-tag v1.2.0

# Custom stages
./aws/scripts/deploy-canary.sh \
  --service backend \
  --stages 5,10,25,50,100 \
  --stage-duration 15

# Manual approval at each stage
./aws/scripts/deploy-canary.sh \
  --service backend \
  --no-auto-promote
```

### Traffic Progression

```
Stage 1: 10% canary, 90% production  (Wait 10 minutes + health checks)
Stage 2: 25% canary, 75% production  (Wait 10 minutes + health checks)
Stage 3: 50% canary, 50% production  (Wait 10 minutes + health checks)
Stage 4: 75% canary, 25% production  (Wait 10 minutes + health checks)
Stage 5: 100% canary, 0% production  (Complete)
```

### Automated Rollback Triggers

The system automatically rolls back if:

- **5XX Error Rate** > 10 errors in 5 minutes
- **Response Time** > 1 second (average)
- **Unhealthy Hosts** > 0
- **Custom CloudWatch Alarms** trigger

### Manual Rollback

```bash
# Rollback active canary deployment
./aws/scripts/deploy-canary.sh \
  --action rollback \
  --deployment-id canary-1234567890
```

## Progressive Delivery

Progressive delivery orchestrates multi-stage deployments with automated validation gates.

### Setup

```bash
module "progressive_delivery" {
  source = "./modules/progressive-delivery"

  project_name = var.project_name
  environment  = var.environment

  # Stage configuration
  canary_stabilization_period = 300  # 5 minutes
  stage_duration             = 600   # 10 minutes
  traffic_stages             = [10, 25, 50, 75, 100]

  # Validation thresholds
  error_rate_threshold     = 1.0   # 1%
  latency_threshold        = 1.0   # 1 second
  success_rate_threshold   = 99.0  # 99%

  notification_email = "ops@yourdomain.com"

  # Auto-trigger on ECR push
  enable_automatic_execution = true

  tags = var.tags
}
```

### Pipeline Stages

The progressive delivery pipeline includes:

1. **Validation:** Pre-deployment checks (tests, linting, security scans)
2. **Canary Deployment:** Deploy to canary environment
3. **Stabilization:** Wait for canary to stabilize
4. **Metrics Validation:** Check error rates, latency, success rate
5. **Traffic Progression:** Gradually increase traffic
6. **Completion:** Finalize deployment
7. **Rollback:** Automatic rollback on failures

### Manual Execution

```bash
# Use orchestration script with progressive strategy
./aws/scripts/orchestrate-deployment.sh \
  --strategy progressive \
  --service backend \
  --environment production \
  --image-tag v1.2.0
```

### Monitoring Pipeline

```bash
# View pipeline execution
aws stepfunctions list-executions \
  --state-machine-arn <state-machine-arn> \
  --max-items 10

# Get execution details
aws stepfunctions describe-execution \
  --execution-arn <execution-arn>
```

## Feature Flags

Feature flags enable runtime control of features without deployments.

### Setup

```bash
module "feature_flags" {
  source = "./modules/feature-flags"

  project_name = var.project_name
  environment  = var.environment

  # Deployment strategy
  deployment_duration_minutes = 20
  growth_factor              = 10  # 10% per interval
  bake_time_minutes          = 10

  alert_email = "ops@yourdomain.com"

  tags = var.tags
}
```

### Creating Feature Flags

1. **Define Flag Configuration:**

```json
{
  "flags": {
    "new-chat-interface": {
      "name": "new-chat-interface",
      "description": "Enable new chat interface"
    },
    "ai-suggestions": {
      "name": "ai-suggestions",
      "description": "Enable AI-powered suggestions"
    }
  },
  "values": {
    "new-chat-interface": {
      "enabled": true,
      "rollout_percentage": 25,
      "rules": [
        {
          "name": "beta-users",
          "enabled": true,
          "conditions": [
            {
              "attribute": "user_tier",
              "operator": "equals",
              "values": ["beta", "premium"]
            }
          ]
        }
      ]
    },
    "ai-suggestions": {
      "enabled": true,
      "rules": [
        {
          "name": "premium-only",
          "enabled": true,
          "conditions": [
            {
              "attribute": "user_tier",
              "operator": "equals",
              "values": ["premium"]
            }
          ]
        }
      ]
    }
  }
}
```

2. **Deploy Configuration:**

```bash
# Create configuration version
aws appconfig create-hosted-configuration-version \
  --application-id <app-id> \
  --configuration-profile-id <profile-id> \
  --content file://feature-flags.json \
  --content-type "application/json"

# Start deployment
aws appconfig start-deployment \
  --application-id <app-id> \
  --environment-id <env-id> \
  --configuration-profile-id <profile-id> \
  --configuration-version <version> \
  --deployment-strategy-id <strategy-id>
```

### Using Feature Flags

**API Endpoint:**

```bash
# Evaluate feature flag
curl -X POST https://api.yourdomain.com/feature-flags/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-chat-interface",
    "context": {
      "user_id": "user123",
      "user_tier": "premium",
      "region": "us-east-1"
    }
  }'

# Response
{
  "flag_key": "new-chat-interface",
  "enabled": true,
  "variant": null,
  "reason": "matched_rule: premium-only",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Client Integration (TypeScript):**

```typescript
// Feature flag client
class FeatureFlagClient {
  async isEnabled(flagKey: string, context: any): Promise<boolean> {
    const response = await fetch('/api/feature-flags/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_key: flagKey, context })
    });

    const result = await response.json();
    return result.enabled;
  }
}

// Usage
const flags = new FeatureFlagClient();

if (await flags.isEnabled('new-chat-interface', { user_id: userId })) {
  // Show new chat interface
} else {
  // Show old chat interface
}
```

## Monitoring & Observability

### CloudWatch Dashboards

The system provides two main dashboards:

1. **Deployment Overview Dashboard**
   - Deployment frequency
   - Success rate
   - Mean time to recovery (MTTR)
   - Deployment duration
   - Change failure rate
   - Canary progress
   - Rollback events

2. **DORA Metrics Dashboard**
   - Deployment frequency (per day)
   - Lead time for changes
   - Mean time to recovery
   - Change failure rate

### Accessing Dashboards

```bash
# Open deployment overview dashboard
aws cloudwatch get-dashboard \
  --dashboard-name lumina-deployment-overview-production

# Open DORA metrics dashboard
aws cloudwatch get-dashboard \
  --dashboard-name lumina-dora-metrics-production

# Or via AWS Console:
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:
```

### Custom Metrics

The system publishes custom metrics:

```
Namespace: <project-name>/Deployments

Metrics:
- DeploymentCount
- SuccessfulDeployments
- FailedDeployments
- DeploymentDuration (minutes)
- RollbackCount
- AutoRollbackCount
- ManualRollbackCount
- RollbackTime (minutes)
- LeadTime (hours)
- CanaryTrafficPercentage
- CanaryHealthScore
```

### Log Analysis

Use CloudWatch Insights for deployment analysis:

```sql
-- Find recent deployments
fields @timestamp, @message
| filter @message like /deployment/
| stats count() as deployment_count by bin(5m)
| sort @timestamp desc

-- Analyze failed deployments
fields @timestamp, @message
| filter @message like /failed/ or @message like /error/
| sort @timestamp desc
| limit 100

-- Calculate deployment duration
fields @timestamp, @message
| filter @message like /deployment started/ or @message like /deployment completed/
| sort @timestamp asc
```

### Alerts

Configured CloudWatch Alarms:

| Alarm | Threshold | Action |
|-------|-----------|--------|
| High Deployment Failure Rate | > 10% | SNS notification |
| Slow Deployments | > 60 minutes | SNS notification |
| Canary High Error Rate | > 10 errors/5min | Auto-rollback |
| Canary High Latency | > 1 second avg | Auto-rollback |
| Canary Unhealthy Hosts | > 0 hosts | Auto-rollback |

## Automated Rollback

### Rollback Triggers

**Automatic rollback occurs when:**

1. Health check failures exceed threshold
2. Error rate spikes during deployment
3. Response time degrades significantly
4. Custom CloudWatch alarms trigger
5. Deployment validation fails

### Rollback Process

**For Blue/Green:**
```
1. Stop traffic to green environment
2. Switch traffic back to blue environment
3. Terminate green environment tasks
4. Send rollback notification
```

**For Canary:**
```
1. Stop traffic progression
2. Shift 100% traffic back to production
3. Terminate canary tasks
4. Clean up canary resources
5. Send rollback notification
```

### Manual Rollback Commands

```bash
# Rollback blue/green deployment
aws deploy stop-deployment \
  --deployment-id <deployment-id> \
  --auto-rollback-enabled

# Rollback canary deployment
./aws/scripts/deploy-canary.sh \
  --action rollback \
  --deployment-id <deployment-id>

# Rollback via CodeDeploy
aws deploy create-deployment \
  --application-name <app-name> \
  --deployment-group-name <group-name> \
  --auto-rollback-configuration enabled=true,events=DEPLOYMENT_FAILURE
```

## Best Practices

### Pre-Deployment

✅ **Always run tests before deploying**
```bash
./aws/scripts/orchestrate-deployment.sh \
  --strategy canary \
  --service backend
# Tests run automatically unless --skip-tests is used
```

✅ **Use semantic versioning for image tags**
```bash
IMAGE_TAG=v1.2.0 ./aws/scripts/deploy-canary.sh --service backend
```

✅ **Review terraform plan before applying**
```bash
./aws/scripts/plan.sh
# Review changes carefully before applying
```

### During Deployment

✅ **Monitor CloudWatch dashboards during deployments**

✅ **Use canary deployments for regular releases**

✅ **Use blue/green for major version changes**

✅ **Enable auto-rollback for production deployments**

✅ **Set up SNS notifications for deployment events**

### Post-Deployment

✅ **Validate deployment success with smoke tests**

✅ **Monitor metrics for 24-48 hours after deployment**

✅ **Document any issues or learnings**

✅ **Review DORA metrics weekly**

### Security

🔒 **Use IAM roles with least privilege**

🔒 **Enable encryption for all S3 buckets and DynamoDB tables**

🔒 **Use AWS Secrets Manager for sensitive configuration**

🔒 **Enable VPC Flow Logs for network monitoring**

🔒 **Regularly rotate credentials**

## Troubleshooting

### Deployment Failures

**Problem:** Deployment fails during validation

**Solution:**
```bash
# Check validation logs
aws codedeploy get-deployment --deployment-id <id>

# Review CloudWatch logs
aws logs tail /aws/codedeploy/<project>/<env> --follow

# Re-run with skip-validation if needed (not recommended for production)
./aws/scripts/orchestrate-deployment.sh --skip-validation
```

**Problem:** Canary stuck at certain percentage

**Solution:**
```bash
# Check canary health
aws cloudwatch describe-alarms \
  --alarm-name-prefix "lumina-backend-canary"

# Review metrics
aws cloudwatch get-metric-statistics \
  --namespace "AWS/ApplicationELB" \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=TargetGroup,Value=<canary-tg-arn>

# Manual rollback if needed
./aws/scripts/deploy-canary.sh --action rollback
```

### Traffic Routing Issues

**Problem:** Traffic not routing to new version

**Solution:**
```bash
# Check ALB listener rules
aws elbv2 describe-listeners --listener-arns <listener-arn>

# Check target group health
aws elbv2 describe-target-health --target-group-arn <tg-arn>

# Verify ECS service
aws ecs describe-services \
  --cluster <cluster-name> \
  --services <service-name>
```

### Performance Degradation

**Problem:** High latency after deployment

**Solution:**
```bash
# Check ECS task CPU/memory
aws ecs describe-services --cluster <cluster> --services <service>

# Review CloudWatch metrics
# Open dashboard and check TargetResponseTime metric

# Scale up if needed
aws ecs update-service \
  --cluster <cluster> \
  --service <service> \
  --desired-count <new-count>
```

### Rollback Issues

**Problem:** Rollback fails or takes too long

**Solution:**
```bash
# Force service update
aws ecs update-service \
  --cluster <cluster> \
  --service <service> \
  --task-definition <previous-task-def> \
  --force-new-deployment

# Check for stuck tasks
aws ecs list-tasks --cluster <cluster> --desired-status STOPPED

# Stop specific task if needed
aws ecs stop-task --cluster <cluster> --task <task-id>
```

## Additional Resources

- [AWS CodeDeploy Documentation](https://docs.aws.amazon.com/codedeploy/)
- [AWS AppConfig Documentation](https://docs.aws.amazon.com/appconfig/)
- [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/)
- [DORA Metrics](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance)

## Support

For issues or questions:

1. Check CloudWatch Logs
2. Review CloudWatch Dashboards
3. Check SNS notifications
4. Consult this documentation
5. Review AWS documentation for specific services

---

**Last Updated:** January 2025
**Version:** 1.0.0
