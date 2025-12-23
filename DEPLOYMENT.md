# Deployment Quick Reference Guide

Quick reference for deployment commands and strategies used in the Lumina project (blue/green, canary, progressive delivery, etc.).

## 🚀 Deployment Commands

### Blue/Green Deployment

```bash
# Deploy backend with blue/green
./aws/scripts/deploy-blue-green.sh --service backend --image-tag v1.2.0

# Deploy both services
./aws/scripts/deploy-blue-green.sh --service both --image-tag v1.2.0

# Deploy without waiting
./aws/scripts/deploy-blue-green.sh --service backend --no-wait
```

### Canary Deployment

```bash
# Standard canary deployment (10% → 25% → 50% → 75% → 100%)
./aws/scripts/deploy-canary.sh --service backend --image-tag v1.2.0

# Custom stages
./aws/scripts/deploy-canary.sh --service backend --stages 5,10,25,50,100

# Manual approval at each stage
./aws/scripts/deploy-canary.sh --service backend --no-auto-promote

# Rollback canary
./aws/scripts/deploy-canary.sh --action rollback --deployment-id <id>
```

### Progressive Delivery

```bash
# Automated multi-stage deployment with validation
./aws/scripts/orchestrate-deployment.sh \
  --strategy progressive \
  --service backend \
  --environment production \
  --image-tag v1.2.0
```

### Orchestrated Deployment

```bash
# Full orchestration with validation
./aws/scripts/orchestrate-deployment.sh \
  --strategy canary \
  --service backend \
  --environment production \
  --auto-approve

# Skip tests (not recommended for production)
./aws/scripts/orchestrate-deployment.sh \
  --strategy blue-green \
  --service frontend \
  --skip-tests

# Skip validation (not recommended for production)
./aws/scripts/orchestrate-deployment.sh \
  --strategy canary \
  --service backend \
  --skip-validation
```

## 📊 Monitoring Commands

### CloudWatch Dashboards

```bash
# List dashboards
aws cloudwatch list-dashboards

# Get deployment overview dashboard
aws cloudwatch get-dashboard \
  --dashboard-name lumina-deployment-overview-production

# Get DORA metrics dashboard
aws cloudwatch get-dashboard \
  --dashboard-name lumina-dora-metrics-production
```

### View Metrics

```bash
# Deployment count (last 24 hours)
aws cloudwatch get-metric-statistics \
  --namespace "lumina/Deployments" \
  --metric-name DeploymentCount \
  --start-time $(date -u -v-24H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Deployment success rate
aws cloudwatch get-metric-statistics \
  --namespace "lumina/Deployments" \
  --metric-name SuccessfulDeployments \
  --start-time $(date -u -v-24H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

### CloudWatch Logs

```bash
# Tail deployment logs
aws logs tail /aws/codedeploy/lumina/production --follow

# Tail Lambda logs
aws logs tail /aws/lambda/lumina-traffic-shifter-production --follow

# Query recent deployments
aws logs start-query \
  --log-group-name /aws/codedeploy/lumina/production \
  --start-time $(date -u -v-1H +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /deployment/ | sort @timestamp desc'
```

## 🎯 Feature Flags

### Create Feature Flag Configuration

```bash
# Create configuration file
cat > feature-flags.json <<EOF
{
  "flags": {
    "new-feature": {
      "name": "new-feature",
      "description": "Enable new feature"
    }
  },
  "values": {
    "new-feature": {
      "enabled": true,
      "rollout_percentage": 25
    }
  }
}
EOF

# Deploy configuration
aws appconfig create-hosted-configuration-version \
  --application-id <app-id> \
  --configuration-profile-id <profile-id> \
  --content file://feature-flags.json \
  --content-type "application/json"
```

### Evaluate Feature Flag

```bash
# Via API
curl -X POST https://api.yourdomain.com/feature-flags/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-feature",
    "context": {
      "user_id": "user123",
      "user_tier": "premium"
    }
  }'
```

## 🔧 Troubleshooting Commands

### Check Deployment Status

```bash
# CodeDeploy deployment status
aws deploy get-deployment --deployment-id <deployment-id>

# List recent deployments
aws deploy list-deployments \
  --application-name lumina-production \
  --deployment-group-name backend-production \
  --max-items 10

# ECS service status
aws ecs describe-services \
  --cluster lumina-production \
  --services production-backend
```

### Check Service Health

```bash
# Target group health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>

# ECS task status
aws ecs list-tasks \
  --cluster lumina-production \
  --service-name production-backend \
  --desired-status RUNNING

# CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix lumina-backend
```

### Manual Rollback

```bash
# Stop CodeDeploy deployment with rollback
aws deploy stop-deployment \
  --deployment-id <deployment-id> \
  --auto-rollback-enabled

# Force ECS service update
aws ecs update-service \
  --cluster lumina-production \
  --service production-backend \
  --task-definition production-backend:42 \
  --force-new-deployment

# Canary rollback
./aws/scripts/deploy-canary.sh \
  --action rollback \
  --deployment-id <deployment-id>
```

## 🏗️ Infrastructure Commands

### Terraform

```bash
# Plan changes
cd terraform
terraform plan

# Apply changes
terraform apply

# Destroy resources (use with caution!)
./aws/scripts/destroy.sh

# Target specific module
terraform apply -target=module.canary_backend

# Import existing resource
terraform import module.codedeploy.aws_codedeploy_app.ecs_app lumina-production
```

### Docker

```bash
# Build and push images
cd server
docker build -t lumina-backend:v1.2.0 .
docker push <ecr-uri>:v1.2.0

cd ../client
docker build -t lumina-frontend:v1.2.0 .
docker push <ecr-uri>:v1.2.0
```

## 📈 DORA Metrics Queries

### Deployment Frequency

```bash
# Deployments per day (last 7 days)
aws cloudwatch get-metric-statistics \
  --namespace "lumina/Deployments" \
  --metric-name DeploymentCount \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

### Lead Time for Changes

```bash
# Average lead time (hours)
aws cloudwatch get-metric-statistics \
  --namespace "lumina/Deployments" \
  --metric-name LeadTime \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average
```

### Mean Time to Recovery

```bash
# Average MTTR (minutes)
aws cloudwatch get-metric-statistics \
  --namespace "lumina/Deployments" \
  --metric-name RollbackTime \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average
```

### Change Failure Rate

```bash
# Calculate failure rate
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "e1",
      "Expression": "(m2/m1)*100"
    },
    {
      "Id": "m1",
      "MetricStat": {
        "Metric": {
          "Namespace": "lumina/Deployments",
          "MetricName": "DeploymentCount"
        },
        "Period": 86400,
        "Stat": "Sum"
      }
    },
    {
      "Id": "m2",
      "MetricStat": {
        "Metric": {
          "Namespace": "lumina/Deployments",
          "MetricName": "FailedDeployments"
        },
        "Period": 86400,
        "Stat": "Sum"
      }
    }
  ]' \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
```

## 🚨 Emergency Procedures

### Immediate Rollback

```bash
# 1. Stop current deployment
aws deploy stop-deployment \
  --deployment-id $(aws deploy list-deployments \
    --application-name lumina-production \
    --deployment-group-name backend-production \
    --include-only-statuses InProgress \
    --query "deployments[0]" --output text) \
  --auto-rollback-enabled

# 2. Force service to previous version
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster lumina-production \
  --services production-backend \
  --query "services[0].deployments[?status=='ACTIVE'][0].taskDefinition" \
  --output text | sed 's/:.*$//')

aws ecs update-service \
  --cluster lumina-production \
  --service production-backend \
  --task-definition "${PREVIOUS_TASK_DEF}:$(($(echo $PREVIOUS_TASK_DEF | sed 's/.*://') - 1))" \
  --force-new-deployment
```

### Scale Service

```bash
# Scale up
aws ecs update-service \
  --cluster lumina-production \
  --service production-backend \
  --desired-count 10

# Scale down
aws ecs update-service \
  --cluster lumina-production \
  --service production-backend \
  --desired-count 2
```

## 📞 Support Resources

- [Advanced Deployments Guide](./docs/ADVANCED_DEPLOYMENTS.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Terraform Modules README](./terraform/modules/README.md)
- [AWS Deployment README](./aws/README.md)

## Environment Variables

Common environment variables for deployment scripts:

```bash
export AWS_REGION=us-east-1
export ENVIRONMENT=production
export SERVICE=backend
export IMAGE_TAG=v1.2.0
export DEPLOYMENT_STRATEGY=canary
export WAIT_FOR_COMPLETION=true
export AUTO_APPROVE=false
export SKIP_VALIDATION=false
export SKIP_TESTS=false
```

---

**Pro Tip:** Bookmark this page for quick reference during deployments!

**Last Updated:** January 2025
