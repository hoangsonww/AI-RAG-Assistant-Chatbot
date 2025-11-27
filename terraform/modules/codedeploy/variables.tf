# ============================================================================
# AWS CodeDeploy Module Variables
# ============================================================================

# ============================================================================
# General Configuration
# ============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ============================================================================
# ECS Configuration
# ============================================================================

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "frontend_service_name" {
  description = "Name of the frontend ECS service"
  type        = string
}

variable "backend_service_name" {
  description = "Name of the backend ECS service"
  type        = string
}

# ============================================================================
# Load Balancer Configuration
# ============================================================================

variable "frontend_listener_arn" {
  description = "ARN of the ALB listener for frontend production traffic"
  type        = string
}

variable "frontend_test_listener_arn" {
  description = "ARN of the ALB listener for frontend test traffic (optional)"
  type        = string
  default     = ""
}

variable "backend_listener_arn" {
  description = "ARN of the ALB listener for backend production traffic"
  type        = string
}

variable "backend_test_listener_arn" {
  description = "ARN of the ALB listener for backend test traffic (optional)"
  type        = string
  default     = ""
}

# ============================================================================
# Target Group Configuration
# ============================================================================

variable "frontend_blue_target_group_name" {
  description = "Name of the frontend blue target group"
  type        = string
}

variable "frontend_green_target_group_name" {
  description = "Name of the frontend green target group"
  type        = string
}

variable "backend_blue_target_group_name" {
  description = "Name of the backend blue target group"
  type        = string
}

variable "backend_green_target_group_name" {
  description = "Name of the backend green target group"
  type        = string
}

# ============================================================================
# Deployment Configuration
# ============================================================================

variable "enable_frontend_deployment" {
  description = "Enable CodeDeploy for frontend service"
  type        = bool
  default     = true
}

variable "enable_backend_deployment" {
  description = "Enable CodeDeploy for backend service"
  type        = bool
  default     = true
}

variable "frontend_deployment_config" {
  description = "Deployment configuration for frontend (CodeDeployDefault.ECSAllAtOnce, CodeDeployDefault.ECSLinear10PercentEvery1Minutes, CodeDeployDefault.ECSLinear10PercentEvery3Minutes, CodeDeployDefault.ECSCanary10Percent5Minutes, CodeDeployDefault.ECSCanary10Percent15Minutes)"
  type        = string
  default     = "CodeDeployDefault.ECSLinear10PercentEvery1Minutes"
}

variable "backend_deployment_config" {
  description = "Deployment configuration for backend (CodeDeployDefault.ECSAllAtOnce, CodeDeployDefault.ECSLinear10PercentEvery1Minutes, CodeDeployDefault.ECSLinear10PercentEvery3Minutes, CodeDeployDefault.ECSCanary10Percent5Minutes, CodeDeployDefault.ECSCanary10Percent15Minutes)"
  type        = string
  default     = "CodeDeployDefault.ECSCanary10Percent5Minutes"
}

variable "blue_termination_wait_time" {
  description = "Time in minutes to wait before terminating blue instances after successful deployment"
  type        = number
  default     = 5
}

variable "deployment_ready_action" {
  description = "Action to take when deployment is ready (CONTINUE_DEPLOYMENT or STOP_DEPLOYMENT)"
  type        = string
  default     = "CONTINUE_DEPLOYMENT"

  validation {
    condition     = contains(["CONTINUE_DEPLOYMENT", "STOP_DEPLOYMENT"], var.deployment_ready_action)
    error_message = "deployment_ready_action must be either CONTINUE_DEPLOYMENT or STOP_DEPLOYMENT"
  }
}

variable "deployment_ready_wait_time" {
  description = "Time in minutes to wait for manual approval before stopping deployment (only used if deployment_ready_action is STOP_DEPLOYMENT)"
  type        = number
  default     = 0
}

# ============================================================================
# CloudWatch Alarms Configuration
# ============================================================================

variable "frontend_cloudwatch_alarms" {
  description = "List of CloudWatch alarm names for frontend deployment monitoring"
  type        = list(string)
  default     = []
}

variable "backend_cloudwatch_alarms" {
  description = "List of CloudWatch alarm names for backend deployment monitoring"
  type        = list(string)
  default     = []
}

variable "ignore_poll_alarm_failure" {
  description = "Whether to ignore failures when polling CloudWatch alarms"
  type        = bool
  default     = false
}

# ============================================================================
# Notification Configuration
# ============================================================================

variable "notification_email" {
  description = "Email address for deployment notifications"
  type        = string
  default     = ""
}

variable "enable_deployment_triggers" {
  description = "Enable SNS notifications for deployment events"
  type        = bool
  default     = true
}

# ============================================================================
# Security Configuration
# ============================================================================

variable "kms_key_id" {
  description = "KMS key ID for encryption (optional)"
  type        = string
  default     = ""
}

# ============================================================================
# Logging Configuration
# ============================================================================

variable "log_retention_days" {
  description = "Number of days to retain deployment logs"
  type        = number
  default     = 30
}

# ============================================================================
# S3 Artifact Storage
# ============================================================================

variable "create_deployment_bucket" {
  description = "Whether to create an S3 bucket for deployment artifacts"
  type        = bool
  default     = true
}
