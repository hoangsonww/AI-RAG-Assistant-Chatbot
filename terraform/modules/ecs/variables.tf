variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  type        = string
}

variable "backend_target_group_arn" {
  description = "ARN of the backend target group"
  type        = string
}

variable "alb_security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "frontend_image" {
  description = "Frontend Docker image"
  type        = string
}

variable "frontend_cpu" {
  description = "Frontend CPU units"
  type        = number
}

variable "frontend_memory" {
  description = "Frontend memory in MB"
  type        = number
}

variable "frontend_desired_count" {
  description = "Desired count of frontend tasks"
  type        = number
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend tasks"
  type        = number
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend tasks"
  type        = number
}

variable "backend_image" {
  description = "Backend Docker image"
  type        = string
}

variable "backend_cpu" {
  description = "Backend CPU units"
  type        = number
}

variable "backend_memory" {
  description = "Backend memory in MB"
  type        = number
}

variable "backend_desired_count" {
  description = "Desired count of backend tasks"
  type        = number
}

variable "backend_min_capacity" {
  description = "Minimum number of backend tasks"
  type        = number
}

variable "backend_max_capacity" {
  description = "Maximum number of backend tasks"
  type        = number
}

variable "backend_domain" {
  description = "Backend domain name"
  type        = string
}

variable "backend_env_secret_arn" {
  description = "Secrets Manager secret ARN containing backend environment variables"
  type        = string
}

variable "pinecone_index_name" {
  description = "Pinecone index name"
  type        = string
}

variable "enable_execute_command" {
  description = "Enable ECS exec for troubleshooting"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
}
