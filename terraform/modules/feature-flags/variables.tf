# ============================================================================
# Feature Flags Module Variables
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

variable "deployment_duration_minutes" {
  description = "Duration for canary deployment of feature flags (minutes)"
  type        = number
  default     = 20
}

variable "growth_factor" {
  description = "Percentage of targets to receive the configuration during each interval"
  type        = number
  default     = 10
}

variable "bake_time_minutes" {
  description = "Time to bake the final configuration (minutes)"
  type        = number
  default     = 10
}

variable "allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "alert_email" {
  description = "Email address for feature flag alerts"
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
