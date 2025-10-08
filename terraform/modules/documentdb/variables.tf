variable "environment" {
  description = "Deployment environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC hosting DocumentDB"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the subnet group"
  type        = list(string)
}

variable "cluster_size" {
  description = "Number of instances in the DocumentDB cluster"
  type        = number
  default     = 2
}

variable "instance_class" {
  description = "Instance class to use for DocumentDB instances"
  type        = string
}

variable "master_username" {
  description = "Master username for DocumentDB"
  type        = string
}

variable "master_password" {
  description = "Master password for DocumentDB"
  type        = string
  sensitive   = true
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Daily time range during which backups are created"
  type        = string
  default     = "07:00-09:00"
}

variable "preferred_maintenance_window" {
  description = "Weekly time range during which maintenance may occur"
  type        = string
  default     = "sun:05:00-sun:07:00"
}

variable "deletion_protection" {
  description = "Enable deletion protection for the cluster"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply modifications immediately rather than during the next maintenance window"
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "KMS key ARN to use for storage encryption"
  type        = string
  default     = null
}
