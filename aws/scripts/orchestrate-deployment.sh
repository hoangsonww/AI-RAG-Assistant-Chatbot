#!/usr/bin/env bash
# ============================================================================
# Deployment Orchestration Master Script
# ============================================================================
# This script orchestrates the entire deployment process with validation,
# health checks, and automated decision making.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOYMENT_STRATEGY="${DEPLOYMENT_STRATEGY:-canary}" # Options: blue-green, canary, progressive
SERVICE="${SERVICE:-backend}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d%H%M%S)}"
SKIP_VALIDATION="${SKIP_VALIDATION:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
AUTO_APPROVE="${AUTO_APPROVE:-false}"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# Pre-Deployment Validation
# ============================================================================

validate_environment() {
    log_info "Validating environment..."

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        return 1
    fi

    # Check required tools
    for tool in aws jq docker; do
        if ! command -v $tool &> /dev/null; then
            log_error "Required tool not found: $tool"
            return 1
        fi
    done

    log_success "Environment validation passed"
}

run_pre_deployment_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log_warning "Skipping pre-deployment tests"
        return 0
    fi

    log_info "Running pre-deployment tests..."

    # Run unit tests
    if [ "$SERVICE" = "backend" ]; then
        cd "${SCRIPT_DIR}/../../server"
        npm test || return 1
    else
        cd "${SCRIPT_DIR}/../../client"
        npm test || return 1
    fi

    log_success "Pre-deployment tests passed"
}

validate_configuration() {
    if [ "$SKIP_VALIDATION" = "true" ]; then
        log_warning "Skipping configuration validation"
        return 0
    fi

    log_info "Validating Terraform configuration..."

    cd "${SCRIPT_DIR}/../../terraform"
    terraform init -upgrade
    terraform validate || return 1

    log_success "Configuration validation passed"
}

# ============================================================================
# Deployment Execution
# ============================================================================

execute_deployment() {
    log_info "========================================"
    log_info "Starting $DEPLOYMENT_STRATEGY deployment"
    log_info "Service: $SERVICE"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "========================================"

    case $DEPLOYMENT_STRATEGY in
        blue-green)
            "${SCRIPT_DIR}/deploy-blue-green.sh" \
                --service "$SERVICE" \
                --environment "$ENVIRONMENT" \
                --region "$AWS_REGION" \
                --image-tag "$IMAGE_TAG"
            ;;
        canary)
            "${SCRIPT_DIR}/deploy-canary.sh" \
                --service "$SERVICE" \
                --environment "$ENVIRONMENT" \
                --region "$AWS_REGION" \
                --image-tag "$IMAGE_TAG"
            ;;
        progressive)
            log_info "Triggering progressive delivery pipeline..."
            trigger_progressive_delivery
            ;;
        *)
            log_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            return 1
            ;;
    esac
}

trigger_progressive_delivery() {
    local state_machine_arn=$(aws stepfunctions list-state-machines \
        --region "$AWS_REGION" \
        --query "stateMachines[?contains(name, 'progressive-delivery')].stateMachineArn" \
        --output text | head -n1)

    if [ -z "$state_machine_arn" ]; then
        log_error "Progressive delivery state machine not found"
        return 1
    fi

    local execution_input=$(cat <<EOF
{
  "deploymentId": "deploy-$(date +%s)",
  "service": "$SERVICE",
  "version": "$IMAGE_TAG",
  "environment": "$ENVIRONMENT"
}
EOF
)

    local execution_arn=$(aws stepfunctions start-execution \
        --region "$AWS_REGION" \
        --state-machine-arn "$state_machine_arn" \
        --input "$execution_input" \
        --query "executionArn" \
        --output text)

    log_success "Progressive delivery execution started: $execution_arn"

    # Monitor execution
    monitor_step_functions_execution "$execution_arn"
}

monitor_step_functions_execution() {
    local execution_arn=$1
    local max_wait=3600
    local elapsed=0

    while [ $elapsed -lt $max_wait ]; do
        local status=$(aws stepfunctions describe-execution \
            --region "$AWS_REGION" \
            --execution-arn "$execution_arn" \
            --query "status" \
            --output text)

        case $status in
            SUCCEEDED)
                log_success "Progressive delivery succeeded"
                return 0
                ;;
            FAILED|TIMED_OUT|ABORTED)
                log_error "Progressive delivery failed with status: $status"
                return 1
                ;;
            RUNNING)
                log_info "Progressive delivery in progress... (${elapsed}s elapsed)"
                sleep 30
                elapsed=$((elapsed + 30))
                ;;
        esac
    done

    log_error "Progressive delivery timed out"
    return 1
}

# ============================================================================
# Post-Deployment Validation
# ============================================================================

validate_deployment() {
    log_info "Running post-deployment validation..."

    # Wait for service to stabilize
    log_info "Waiting for service to stabilize..."
    sleep 30

    # Check service health
    check_service_health || return 1

    # Run smoke tests
    run_smoke_tests || return 1

    log_success "Post-deployment validation passed"
}

check_service_health() {
    log_info "Checking service health..."

    local cluster_name=$(aws ecs list-clusters \
        --region "$AWS_REGION" \
        --query "clusterArns[?contains(@, '$ENVIRONMENT')]" \
        --output text | head -n1 | awk -F/ '{print $NF}')

    local service_name="${ENVIRONMENT}-${SERVICE}"

    local running_count=$(aws ecs describe-services \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --services "$service_name" \
        --query "services[0].runningCount" \
        --output text)

    local desired_count=$(aws ecs describe-services \
        --region "$AWS_REGION" \
        --cluster "$cluster_name" \
        --services "$service_name" \
        --query "services[0].desiredCount" \
        --output text)

    if [ "$running_count" -eq "$desired_count" ]; then
        log_success "Service is healthy: $running_count/$desired_count tasks running"
        return 0
    else
        log_error "Service is unhealthy: $running_count/$desired_count tasks running"
        return 1
    fi
}

run_smoke_tests() {
    log_info "Running smoke tests..."

    # Get ALB DNS name
    local alb_dns=$(aws elbv2 describe-load-balancers \
        --region "$AWS_REGION" \
        --query "LoadBalancers[?contains(LoadBalancerName, '$ENVIRONMENT')].DNSName" \
        --output text | head -n1)

    if [ -z "$alb_dns" ]; then
        log_warning "Could not find ALB DNS name"
        return 0
    fi

    # Test health endpoint
    local health_url="http://${alb_dns}/health"
    if [ "$SERVICE" = "backend" ]; then
        health_url="http://${alb_dns}/api/health"
    fi

    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" || echo "000")

    if [ "$response_code" -ge 200 ] && [ "$response_code" -lt 300 ]; then
        log_success "Smoke tests passed (HTTP $response_code)"
        return 0
    else
        log_error "Smoke tests failed (HTTP $response_code)"
        return 1
    fi
}

# ============================================================================
# Rollback Management
# ============================================================================

rollback_on_failure() {
    log_warning "========================================"
    log_warning "Deployment failed - initiating rollback"
    log_warning "========================================"

    case $DEPLOYMENT_STRATEGY in
        canary)
            "${SCRIPT_DIR}/deploy-canary.sh" --action rollback
            ;;
        blue-green)
            log_info "Blue/green deployment handles rollback automatically"
            ;;
        *)
            log_warning "Manual rollback may be required"
            ;;
    esac
}

# ============================================================================
# Main Orchestration
# ============================================================================

main() {
    log_info "========================================"
    log_info "Deployment Orchestration Starting"
    log_info "========================================"

    # Step 1: Pre-deployment validation
    validate_environment || exit 1
    run_pre_deployment_tests || exit 1
    validate_configuration || exit 1

    # Step 2: Approval gate
    if [ "$AUTO_APPROVE" != "true" ]; then
        log_warning "Ready to deploy. Proceed? (y/n)"
        read -r response
        if [[ ! $response =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Step 3: Execute deployment
    if execute_deployment; then
        log_success "Deployment executed successfully"
    else
        log_error "Deployment execution failed"
        rollback_on_failure
        exit 1
    fi

    # Step 4: Post-deployment validation
    if validate_deployment; then
        log_success "Deployment validation passed"
    else
        log_error "Deployment validation failed"
        rollback_on_failure
        exit 1
    fi

    log_success "========================================"
    log_success "Deployment Completed Successfully!"
    log_success "========================================"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strategy) DEPLOYMENT_STRATEGY="$2"; shift 2 ;;
        --service) SERVICE="$2"; shift 2 ;;
        --environment) ENVIRONMENT="$2"; shift 2 ;;
        --region) AWS_REGION="$2"; shift 2 ;;
        --image-tag) IMAGE_TAG="$2"; shift 2 ;;
        --skip-validation) SKIP_VALIDATION="true"; shift ;;
        --skip-tests) SKIP_TESTS="true"; shift ;;
        --auto-approve) AUTO_APPROVE="true"; shift ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --strategy STRATEGY   Deployment strategy (blue-green, canary, progressive)"
            echo "  --service SERVICE     Service to deploy"
            echo "  --environment ENV     Environment"
            echo "  --region REGION       AWS region"
            echo "  --image-tag TAG       Docker image tag"
            echo "  --skip-validation     Skip configuration validation"
            echo "  --skip-tests          Skip pre-deployment tests"
            echo "  --auto-approve        Skip approval gate"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
