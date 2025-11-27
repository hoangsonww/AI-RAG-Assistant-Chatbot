#!/usr/bin/env bash
# ============================================================================
# Canary Deployment Script with Progressive Traffic Shifting
# ============================================================================
# This script automates canary deployments with progressive traffic shifting.
# Features:
# - Configurable traffic stages (e.g., 10% -> 25% -> 50% -> 100%)
# - Health check validation at each stage
# - Automated rollback on failures
# - Manual promotion options
# - Real-time monitoring
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
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Environment variables with defaults
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
SERVICE="${SERVICE:-backend}" # Options: frontend, backend
CANARY_STAGES="${CANARY_STAGES:-10,25,50,75,100}"
STAGE_DURATION="${STAGE_DURATION:-10}" # minutes
AUTO_PROMOTE="${AUTO_PROMOTE:-true}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"
DEPLOYMENT_ID="canary-$(date +%s)"

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

log_stage() {
    echo -e "${CYAN}[STAGE]${NC} $1"
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

get_lambda_function_name() {
    log_info "Finding traffic shifter Lambda function..."

    LAMBDA_FUNCTION=$(aws lambda list-functions \
        --region "$AWS_REGION" \
        --query "Functions[?contains(FunctionName, '${SERVICE}-traffic-shifter')].FunctionName" \
        --output text | head -n1)

    if [ -z "$LAMBDA_FUNCTION" ]; then
        log_error "Traffic shifter Lambda function not found"
        log_info "Make sure the canary deployment module is deployed"
        exit 1
    fi

    log_success "Found Lambda function: $LAMBDA_FUNCTION"
}

build_and_push_image() {
    log_info "Building and pushing Docker image for $SERVICE..."

    # Get ECR repository URI
    local ecr_uri=$(aws ecr describe-repositories \
        --region "$AWS_REGION" \
        --repository-names "lumina-${SERVICE}" \
        --query "repositories[0].repositoryUri" \
        --output text 2>/dev/null || echo "")

    if [ -z "$ecr_uri" ]; then
        log_error "ECR repository not found for service: $SERVICE"
        exit 1
    fi

    # Login to ECR
    log_info "Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ecr_uri"

    # Build image
    local dockerfile_path
    if [ "$SERVICE" = "frontend" ]; then
        dockerfile_path="${PROJECT_ROOT}/client/Dockerfile"
    else
        dockerfile_path="${PROJECT_ROOT}/server/Dockerfile"
    fi

    log_info "Building Docker image..."
    docker build -t "${ecr_uri}:${IMAGE_TAG}" -f "$dockerfile_path" "$PROJECT_ROOT"

    # Push image
    log_info "Pushing Docker image..."
    docker push "${ecr_uri}:${IMAGE_TAG}"

    log_success "Image pushed: ${ecr_uri}:${IMAGE_TAG}"
}

create_canary_task_definition() {
    log_info "Creating canary task definition..."

    # Get current task definition
    local current_task_def=$(aws ecs describe-task-definition \
        --region "$AWS_REGION" \
        --task-definition "${ENVIRONMENT}-${SERVICE}" \
        --query "taskDefinition" \
        --output json)

    # Get ECR repository URI
    local ecr_uri=$(aws ecr describe-repositories \
        --region "$AWS_REGION" \
        --repository-names "lumina-${SERVICE}" \
        --query "repositories[0].repositoryUri" \
        --output text)

    local new_image="${ecr_uri}:${IMAGE_TAG}"

    # Update image and create canary task definition
    local updated_task_def=$(echo "$current_task_def" | jq \
        --arg image "$new_image" \
        --arg family "${ENVIRONMENT}-${SERVICE}-canary" \
        '.family = $family |
         .containerDefinitions[0].image = $image |
         del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

    # Register canary task definition
    CANARY_TASK_DEF=$(echo "$updated_task_def" | \
        aws ecs register-task-definition \
        --region "$AWS_REGION" \
        --cli-input-json file:///dev/stdin \
        --query "taskDefinition.taskDefinitionArn" \
        --output text)

    log_success "Created canary task definition: $CANARY_TASK_DEF"
}

deploy_canary_tasks() {
    log_info "Deploying canary tasks to ECS..."

    # Get ECS cluster name
    local cluster_name=$(aws ecs list-clusters \
        --region "$AWS_REGION" \
        --query "clusterArns[?contains(@, '${ENVIRONMENT}')]" \
        --output text | head -n1 | awk -F/ '{print $NF}')

    # Get canary target group ARN
    local canary_tg=$(aws elbv2 describe-target-groups \
        --region "$AWS_REGION" \
        --query "TargetGroups[?contains(TargetGroupName, '${SERVICE}-canary')].TargetGroupArn" \
        --output text | head -n1)

    if [ -z "$canary_tg" ]; then
        log_error "Canary target group not found"
        exit 1
    fi

    # Get service configuration
    local service_config=$(aws ecs describe-services \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --services "${ENVIRONMENT}-${SERVICE}" \
        --query "services[0]" \
        --output json)

    # Extract network configuration
    local subnets=$(echo "$service_config" | jq -r '.networkConfiguration.awsvpcConfiguration.subnets | join(",")')
    local security_groups=$(echo "$service_config" | jq -r '.networkConfiguration.awsvpcConfiguration.securityGroups | join(",")')

    # Run canary tasks (start with 1 task)
    log_info "Running canary task..."
    aws ecs run-task \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --task-definition "$CANARY_TASK_DEF" \
        --count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$security_groups],assignPublicIp=ENABLED}" \
        --tags "key=Deployment,value=Canary" "key=DeploymentId,value=$DEPLOYMENT_ID" \
        > /dev/null

    log_success "Canary tasks deployed"

    # Wait for tasks to be healthy
    log_info "Waiting for canary tasks to become healthy..."
    sleep 30

    # Check task health
    local running_tasks=$(aws ecs list-tasks \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --family "${ENVIRONMENT}-${SERVICE}-canary" \
        --desired-status RUNNING \
        --query "taskArns" \
        --output text | wc -w)

    if [ "$running_tasks" -eq 0 ]; then
        log_error "No canary tasks are running"
        exit 1
    fi

    log_success "Canary tasks are healthy"
}

invoke_traffic_shifter() {
    local action=$1
    local canary_percentage=${2:-0}

    log_info "Invoking traffic shifter: action=$action, percentage=$canary_percentage%"

    local payload=$(cat <<EOF
{
  "action": "$action",
  "deployment_id": "$DEPLOYMENT_ID",
  "canary_percentage": $canary_percentage,
  "service": "$SERVICE",
  "canary_version": "$IMAGE_TAG"
}
EOF
)

    local response=$(aws lambda invoke \
        --region "$AWS_REGION" \
        --function-name "$LAMBDA_FUNCTION" \
        --payload "$payload" \
        --cli-binary-format raw-in-base64-out \
        /tmp/lambda-response.json 2>&1)

    # Check for errors
    if echo "$response" | grep -q "FunctionError"; then
        log_error "Lambda invocation failed"
        cat /tmp/lambda-response.json
        return 1
    fi

    log_success "Traffic shifter invoked successfully"
    return 0
}

start_canary_deployment() {
    log_info "========================================"
    log_info "Starting Canary Deployment"
    log_info "========================================"
    log_info "Service: $SERVICE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Stages: $CANARY_STAGES"
    log_info "Stage Duration: ${STAGE_DURATION} minutes"
    log_info "========================================"

    # Build and push new image
    build_and_push_image

    # Create canary task definition
    create_canary_task_definition

    # Deploy canary tasks
    deploy_canary_tasks

    # Start traffic shifting
    invoke_traffic_shifter "start" 0
}

progress_canary_stages() {
    log_info "Progressing through canary stages..."

    IFS=',' read -ra STAGES <<< "$CANARY_STAGES"

    for stage in "${STAGES[@]}"; do
        log_stage "Shifting ${stage}% traffic to canary..."

        # Invoke traffic shifter
        if ! invoke_traffic_shifter "progress" "$stage"; then
            log_error "Failed to shift traffic to ${stage}%"
            rollback_canary
            exit 1
        fi

        # Check if this is the final stage
        if [ "$stage" -eq 100 ]; then
            log_success "Canary deployment complete - 100% traffic on canary"
            break
        fi

        # Wait for stage duration
        log_info "Monitoring canary at ${stage}% for ${STAGE_DURATION} minutes..."

        # Check health during stage
        for i in $(seq 1 "$STAGE_DURATION"); do
            sleep 60
            log_info "Stage ${stage}%: ${i}/${STAGE_DURATION} minutes elapsed"

            # Check canary health
            if ! check_canary_health; then
                log_error "Canary health check failed at ${stage}% stage"

                if [ "$AUTO_PROMOTE" = "false" ]; then
                    log_warning "Auto-promote disabled. Manual intervention required."
                    log_info "To rollback: $0 --action rollback --deployment-id $DEPLOYMENT_ID"
                    exit 1
                else
                    rollback_canary
                    exit 1
                fi
            fi
        done

        log_success "Stage ${stage}% completed successfully"

        # Prompt for manual approval if auto-promote is disabled
        if [ "$AUTO_PROMOTE" = "false" ] && [ "$stage" -ne 100 ]; then
            read -p "Promote to next stage? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_warning "Deployment paused. Keeping ${stage}% traffic on canary."
                log_info "To continue: $0 --action continue --deployment-id $DEPLOYMENT_ID"
                log_info "To rollback: $0 --action rollback --deployment-id $DEPLOYMENT_ID"
                exit 0
            fi
        fi
    done
}

check_canary_health() {
    # Get canary CloudWatch alarms
    local alarms=$(aws cloudwatch describe-alarms \
        --region "$AWS_REGION" \
        --alarm-name-prefix "${ENVIRONMENT}-${SERVICE}-canary" \
        --query "MetricAlarms[?StateValue=='ALARM'].AlarmName" \
        --output text)

    if [ -n "$alarms" ]; then
        log_error "Canary alarms in ALARM state: $alarms"
        return 1
    fi

    return 0
}

rollback_canary() {
    log_warning "========================================"
    log_warning "Rolling back canary deployment"
    log_warning "========================================"

    # Invoke traffic shifter for rollback
    invoke_traffic_shifter "rollback" 0

    # Stop canary tasks
    log_info "Stopping canary tasks..."

    local cluster_name=$(aws ecs list-clusters \
        --region "$AWS_REGION" \
        --query "clusterArns[?contains(@, '${ENVIRONMENT}')]" \
        --output text | head -n1 | awk -F/ '{print $NF}')

    local canary_tasks=$(aws ecs list-tasks \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --family "${ENVIRONMENT}-${SERVICE}-canary" \
        --query "taskArns" \
        --output text)

    for task in $canary_tasks; do
        aws ecs stop-task \
            --region "$AWS_REGION" \
            --cluster "$cluster_name" \
            --task "$task" \
            > /dev/null
    done

    log_success "Canary deployment rolled back successfully"
}

complete_canary_deployment() {
    log_info "========================================"
    log_info "Completing canary deployment"
    log_info "========================================"

    # Invoke traffic shifter to complete
    invoke_traffic_shifter "complete" 100

    # Update production service with canary task definition
    log_info "Updating production service..."

    local cluster_name=$(aws ecs list-clusters \
        --region "$AWS_REGION" \
        --query "clusterArns[?contains(@, '${ENVIRONMENT}')]" \
        --output text | head -n1 | awk -F/ '{print $NF}')

    # Create production task definition with canary image
    local prod_task_def=$(echo "$CANARY_TASK_DEF" | sed "s/-canary//")

    aws ecs update-service \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --service "${ENVIRONMENT}-${SERVICE}" \
        --task-definition "$prod_task_def" \
        --force-new-deployment \
        > /dev/null

    # Clean up canary tasks
    log_info "Cleaning up canary tasks..."
    local canary_tasks=$(aws ecs list-tasks \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --family "${ENVIRONMENT}-${SERVICE}-canary" \
        --query "taskArns" \
        --output text)

    for task in $canary_tasks; do
        aws ecs stop-task \
            --region "$AWS_REGION" \
            --cluster "$cluster_name" \
            --task "$task" \
            > /dev/null
    done

    log_success "========================================"
    log_success "Canary deployment completed successfully!"
    log_success "========================================"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    # Check prerequisites
    check_prerequisites

    # Get Lambda function name
    get_lambda_function_name

    # Start canary deployment
    start_canary_deployment

    # Progress through stages
    progress_canary_stages

    # Complete deployment
    complete_canary_deployment
}

# Handle script arguments
ACTION="deploy"

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
        --stages)
            CANARY_STAGES="$2"
            shift 2
            ;;
        --stage-duration)
            STAGE_DURATION="$2"
            shift 2
            ;;
        --no-auto-promote)
            AUTO_PROMOTE="false"
            shift
            ;;
        --action)
            ACTION="$2"
            shift 2
            ;;
        --deployment-id)
            DEPLOYMENT_ID="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --service SERVICE         Service to deploy (frontend, backend) [default: backend]"
            echo "  --environment ENV         Environment name [default: production]"
            echo "  --region REGION           AWS region [default: us-east-1]"
            echo "  --image-tag TAG           Docker image tag [default: timestamp]"
            echo "  --stages STAGES           Comma-separated traffic stages [default: 10,25,50,75,100]"
            echo "  --stage-duration MINUTES  Duration at each stage [default: 10]"
            echo "  --no-auto-promote         Require manual approval at each stage"
            echo "  --action ACTION           Action to perform (deploy, rollback, continue) [default: deploy]"
            echo "  --deployment-id ID        Deployment ID (for rollback/continue)"
            echo "  --help                    Show this help message"
            echo ""
            echo "Examples:"
            echo "  # Start canary deployment"
            echo "  $0 --service backend --stages 10,25,50,100"
            echo ""
            echo "  # Rollback deployment"
            echo "  $0 --action rollback --deployment-id canary-1234567890"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Execute action
case $ACTION in
    deploy)
        main
        ;;
    rollback)
        check_prerequisites
        get_lambda_function_name
        rollback_canary
        ;;
    continue)
        check_prerequisites
        get_lambda_function_name
        progress_canary_stages
        complete_canary_deployment
        ;;
    *)
        log_error "Unknown action: $ACTION"
        exit 1
        ;;
esac
