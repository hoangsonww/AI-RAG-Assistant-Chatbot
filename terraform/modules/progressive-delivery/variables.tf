# ============================================================================
# Progressive Delivery Module Variables
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

variable "canary_stabilization_period" {
  description = "Time to wait for canary to stabilize (seconds)"
  type        = number
  default     = 300
}

variable "stage_duration" {
  description = "Duration of each traffic stage (seconds)"
  type        = number
  default     = 600
}

variable "traffic_stages" {
  description = "Traffic progression stages (percentages)"
  type        = list(number)
  default     = [10, 25, 50, 75, 100]
}

variable "error_rate_threshold" {
  description = "Maximum acceptable error rate (percentage)"
  type        = number
  default     = 1.0
}

variable "latency_threshold" {
  description = "Maximum acceptable latency (seconds)"
  type        = number
  default     = 1.0
}

variable "success_rate_threshold" {
  description = "Minimum acceptable success rate (percentage)"
  type        = number
  default     = 99.0
}

variable "notification_email" {
  description = "Email address for deployment notifications"
  type        = string
  default     = ""
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (optional)"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

variable "enable_automatic_execution" {
  description = "Enable automatic execution on ECR image push"
  type        = bool
  default     = false
}
