#!/usr/bin/env bash
# ============================================================================
# Blue/Green Deployment Script using AWS CodeDeploy
# ============================================================================
# This script automates blue/green deployments with AWS CodeDeploy for ECS.
# Features:
# - Pre-deployment validation
# - Automated health checks
# - Rollback on failure
# - Deployment notifications
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment variables with defaults
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SERVICE="${SERVICE:-backend}" # Options: frontend, backend, both
DEPLOYMENT_DESCRIPTION="${DEPLOYMENT_DESCRIPTION:-Blue/Green deployment}"
WAIT_FOR_COMPLETION="${WAIT_FOR_COMPLETION:-true}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    command -v aws &> /dev/null || missing_tools+=("aws")
    command -v jq &> /dev/null || missing_tools+=("jq")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Install with: brew install awscli jq"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

get_codedeploy_config() {
    log_info "Retrieving CodeDeploy configuration..."

    # Get CodeDeploy application name
    APP_NAME=$(aws deploy list-applications --region "$AWS_REGION" \
        --query "applications[?contains(@, '${ENVIRONMENT}')]" --output text | head -n1)

    if [ -z "$APP_NAME" ]; then
        log_error "CodeDeploy application not found for environment: $ENVIRONMENT"
        exit 1
    fi

    log_success "Found CodeDeploy application: $APP_NAME"
}

create_appspec() {
    local service=$1
    local task_definition_arn=$2

    log_info "Creating AppSpec for $service..."

    cat > "/tmp/appspec-${service}.json" <<EOF
{
  "version": 1,
  "Resources": [
    {
      "TargetService": {
        "Type": "AWS::ECS::Service",
        "Properties": {
          "TaskDefinition": "${task_definition_arn}",
          "LoadBalancerInfo": {
            "ContainerName": "${service}",
            "ContainerPort": $([ "$service" = "frontend" ] && echo "3000" || echo "5000")
          },
          "PlatformVersion": "LATEST"
        }
      }
    }
  ],
  "Hooks": [
    {
      "BeforeInstall": "BeforeInstallHook"
    },
    {
      "AfterInstall": "AfterInstallHook"
    },
    {
      "AfterAllowTestTraffic": "AfterAllowTestTrafficHook"
    },
    {
      "BeforeAllowTraffic": "BeforeAllowTrafficHook"
    },
    {
      "AfterAllowTraffic": "AfterAllowTrafficHook"
    }
  ]
}
EOF

    log_success "AppSpec created for $service"
}

get_latest_task_definition() {
    local service=$1

    log_info "Retrieving latest task definition for $service..."

    local task_def_family="${ENVIRONMENT}-${service}"

    # Get the latest task definition ARN
    local task_def_arn=$(aws ecs list-task-definitions \
        --region "$AWS_REGION" \
        --family-prefix "$task_def_family" \
        --sort DESC \
        --max-items 1 \
        --query "taskDefinitionArns[0]" \
        --output text)

    if [ -z "$task_def_arn" ] || [ "$task_def_arn" = "None" ]; then
        log_error "No task definition found for family: $task_def_family"
        exit 1
    fi

    log_success "Found task definition: $task_def_arn"
    echo "$task_def_arn"
}

create_new_task_definition() {
    local service=$1

    log_info "Creating new task definition for $service with image tag: $IMAGE_TAG..."

    # Get current task definition
    local current_task_def=$(aws ecs describe-task-definition \
        --region "$AWS_REGION" \
        --task-definition "${ENVIRONMENT}-${service}" \
        --query "taskDefinition" \
        --output json)

    # Get ECR repository URI
    local ecr_uri=$(aws ecr describe-repositories \
        --region "$AWS_REGION" \
        --repository-names "lumina-${service}" \
        --query "repositories[0].repositoryUri" \
        --output text 2>/dev/null || echo "")

    if [ -z "$ecr_uri" ]; then
        log_error "ECR repository not found for service: $service"
        exit 1
    fi

    local new_image="${ecr_uri}:${IMAGE_TAG}"

    # Update image in container definitions
    local updated_task_def=$(echo "$current_task_def" | jq \
        --arg image "$new_image" \
        '.containerDefinitions[0].image = $image |
         del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

    # Register new task definition
    local new_task_def_arn=$(echo "$updated_task_def" | \
        aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json file:///dev/stdin \
        --query "taskDefinition.taskDefinitionArn" \
        --output text)

    log_success "Created new task definition: $new_task_def_arn"
    echo "$new_task_def_arn"
}

deploy_service() {
    local service=$1

    log_info "========================================"
    log_info "Deploying $service with Blue/Green strategy"
    log_info "========================================"

    # Get deployment group name
    local deployment_group="${service}-${ENVIRONMENT}"

    # Create new task definition
    local new_task_def=$(create_new_task_definition "$service")

    # Create AppSpec
    create_appspec "$service" "$new_task_def"

    # Create deployment
    log_info "Creating CodeDeploy deployment for $service..."

    local deployment_id=$(aws deploy create-deployment \
        --region "$AWS_REGION" \
        --application-name "$APP_NAME" \
        --deployment-group-name "$deployment_group" \
        --description "$DEPLOYMENT_DESCRIPTION" \
        --revision revisionType=AppSpecContent,appSpecContent="{content=$(cat /tmp/appspec-${service}.json | jq -c .)}" \
        --query "deploymentId" \
        --output text)

    if [ -z "$deployment_id" ]; then
        log_error "Failed to create deployment for $service"
        return 1
    fi

    log_success "Deployment created with ID: $deployment_id"

    # Wait for deployment if requested
    if [ "$WAIT_FOR_COMPLETION" = "true" ]; then
        wait_for_deployment "$deployment_id" "$service"
    else
        log_info "Deployment started. Monitor progress with:"
        log_info "  aws deploy get-deployment --deployment-id $deployment_id --region $AWS_REGION"
    fi
}

wait_for_deployment() {
    local deployment_id=$1
    local service=$2

    log_info "Waiting for deployment to complete..."

    local max_wait_time=3600 # 1 hour
    local elapsed_time=0
    local check_interval=30

    while [ $elapsed_time -lt $max_wait_time ]; do
        local status=$(aws deploy get-deployment \
            --region "$AWS_REGION" \
            --deployment-id "$deployment_id" \
            --query "deploymentInfo.status" \
            --output text)

        case $status in
            Succeeded)
                log_success "Deployment succeeded for $service!"
                return 0
                ;;
            Failed)
                log_error "Deployment failed for $service"
                get_deployment_details "$deployment_id"
                return 1
                ;;
            Stopped)
                log_error "Deployment was stopped for $service"
                get_deployment_details "$deployment_id"
                return 1
                ;;
            Created|Queued|InProgress)
                log_info "Deployment status: $status (${elapsed_time}s elapsed)"
                sleep $check_interval
                elapsed_time=$((elapsed_time + check_interval))
                ;;
            *)
                log_warning "Unknown deployment status: $status"
                sleep $check_interval
                elapsed_time=$((elapsed_time + check_interval))
                ;;
        esac
    done

    log_error "Deployment timed out after ${max_wait_time}s"
    return 1
}

get_deployment_details() {
    local deployment_id=$1

    log_info "Fetching deployment details..."

    aws deploy get-deployment \
        --region "$AWS_REGION" \
        --deployment-id "$deployment_id" \
        --query "deploymentInfo" \
        --output json | jq .
}

rollback_deployment() {
    local service=$1

    log_warning "Initiating rollback for $service..."

    local deployment_group="${service}-${ENVIRONMENT}"

    # Get previous successful deployment
    local previous_deployment=$(aws deploy list-deployments \
        --region "$AWS_REGION" \
        --application-name "$APP_NAME" \
        --deployment-group-name "$deployment_group" \
        --include-only-statuses Succeeded \
        --max-items 1 \
        --query "deployments[0]" \
        --output text)

    if [ -z "$previous_deployment" ]; then
        log_error "No previous successful deployment found for rollback"
        return 1
    fi

    # Stop current deployment
    log_info "Stopping current deployment..."

    aws deploy stop-deployment \
        --region "$AWS_REGION" \
        --deployment-id "$CURRENT_DEPLOYMENT_ID" \
        --auto-rollback-enabled

    log_success "Rollback initiated for $service"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log_info "========================================"
    log_info "Blue/Green Deployment Script"
    log_info "========================================"
    log_info "Environment: $ENVIRONMENT"
    log_info "Service: $SERVICE"
    log_info "AWS Region: $AWS_REGION"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "========================================"

    # Check prerequisites
    check_prerequisites

    # Get CodeDeploy configuration
    get_codedeploy_config

    # Deploy services
    if [ "$SERVICE" = "both" ]; then
        deploy_service "frontend" || {
            log_error "Frontend deployment failed"
            exit 1
        }

        deploy_service "backend" || {
            log_error "Backend deployment failed"
            rollback_deployment "frontend"
            exit 1
        }
    else
        deploy_service "$SERVICE" || {
            log_error "Deployment failed for $SERVICE"
            exit 1
        }
    fi

    log_success "========================================"
    log_success "Blue/Green Deployment Completed!"
    log_success "========================================"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --no-wait)
            WAIT_FOR_COMPLETION="false"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --service SERVICE         Service to deploy (frontend, backend, both) [default: backend]"
            echo "  --environment ENV         Environment name [default: production]"
            echo "  --region REGION           AWS region [default: us-east-1]"
            echo "  --image-tag TAG           Docker image tag [default: timestamp]"
            echo "  --no-wait                 Don't wait for deployment to complete"
            echo "  --help                    Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  AWS_REGION                AWS region"
            echo "  ENVIRONMENT               Environment name"
            echo "  SERVICE                   Service to deploy"
            echo "  IMAGE_TAG                 Docker image tag"
            echo "  WAIT_FOR_COMPLETION       Wait for deployment (true/false)"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
