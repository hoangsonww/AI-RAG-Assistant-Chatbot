# ============================================================================
# Deployment Monitoring Module Variables
# ============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}

variable "failure_rate_threshold" {
  description = "Maximum acceptable failure rate (%)"
  type        = number
  default     = 10
}

variable "deployment_duration_threshold" {
  description = "Maximum acceptable deployment duration (minutes)"
  type        = number
  default     = 60
}

variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = ""
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
  default     = ""
}
