variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC identifier"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the cache subnet group"
  type        = list(string)
}

variable "node_type" {
  description = "Instance class for cache nodes"
  type        = string
}

variable "num_cache_nodes" {
  description = "Number of cache nodes to deploy"
  type        = number
  default     = 2
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "parameter_group_family" {
  description = "Parameter group family for Redis"
  type        = string
  default     = "redis7"
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = true
}

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ARN for encryption at rest"
  type        = string
  default     = null
}

variable "auth_token" {
  description = "Redis AUTH token for transit encryption"
  type        = string
  default     = null
  sensitive   = true
}

variable "maintenance_window" {
  description = "Weekly maintenance window"
  type        = string
  default     = "sun:06:00-sun:07:00"
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots"
  type        = number
  default     = 7
}
