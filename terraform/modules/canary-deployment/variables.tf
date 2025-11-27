# ============================================================================
# Canary Deployment Module Variables
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

variable "service_name" {
  description = "Name of the service (e.g., frontend, backend)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ============================================================================
# Networking Configuration
# ============================================================================

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "service_port" {
  description = "Port on which the service runs"
  type        = number
}

# ============================================================================
# Load Balancer Configuration
# ============================================================================

variable "listener_arn" {
  description = "ARN of the ALB listener for traffic routing"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer (for CloudWatch metrics)"
  type        = string
}

variable "production_target_group_arn" {
  description = "ARN of the production target group"
  type        = string
}

# ============================================================================
# Health Check Configuration
# ============================================================================

variable "health_check_path" {
  description = "Path for health checks"
  type        = string
  default     = "/health"
}

variable "health_check_interval" {
  description = "Interval between health checks (seconds)"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Timeout for health checks (seconds)"
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks before considering target healthy"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks before considering target unhealthy"
  type        = number
  default     = 3
}

variable "health_check_matcher" {
  description = "HTTP status codes to consider healthy"
  type        = string
  default     = "200-299"
}

# ============================================================================
# Canary Deployment Configuration
# ============================================================================

variable "canary_traffic_stages" {
  description = "List of traffic percentages for canary stages (e.g., [10, 25, 50, 75, 100])"
  type        = list(number)
  default     = [10, 25, 50, 75, 100]

  validation {
    condition     = alltrue([for stage in var.canary_traffic_stages : stage >= 0 && stage <= 100])
    error_message = "All traffic stages must be between 0 and 100"
  }
}

variable "stage_duration_minutes" {
  description = "Duration to wait at each canary stage before progressing (minutes)"
  type        = number
  default     = 10

  validation {
    condition     = var.stage_duration_minutes >= 1 && var.stage_duration_minutes <= 60
    error_message = "Stage duration must be between 1 and 60 minutes"
  }
}

variable "enable_auto_progression" {
  description = "Enable automatic progression through canary stages"
  type        = bool
  default     = true
}

variable "auto_rollback_enabled" {
  description = "Enable automatic rollback on alarm triggers"
  type        = bool
  default     = true
}

# ============================================================================
# Monitoring Configuration
# ============================================================================

variable "error_rate_threshold" {
  description = "Maximum number of 5XX errors before triggering alarm"
  type        = number
  default     = 10
}

variable "error_rate_period" {
  description = "Period for error rate evaluation (seconds)"
  type        = number
  default     = 300
}

variable "error_rate_evaluation_periods" {
  description = "Number of periods to evaluate for error rate alarm"
  type        = number
  default     = 2
}

variable "latency_threshold" {
  description = "Maximum average response time (seconds) before triggering alarm"
  type        = number
  default     = 1.0
}

variable "latency_period" {
  description = "Period for latency evaluation (seconds)"
  type        = number
  default     = 300
}

variable "latency_evaluation_periods" {
  description = "Number of periods to evaluate for latency alarm"
  type        = number
  default     = 2
}

# ============================================================================
# Notification Configuration
# ============================================================================

variable "alert_email" {
  description = "Email address for canary deployment alerts"
  type        = string
  default     = ""
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
  description = "Number of days to retain Lambda logs"
  type        = number
  default     = 30
}
