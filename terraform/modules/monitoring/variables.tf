variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "frontend_service_name" {
  description = "Name of the ECS frontend service"
  type        = string
}

variable "backend_service_name" {
  description = "Name of the ECS backend service"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  type        = string
}

variable "documentdb_cluster_id" {
  description = "DocumentDB cluster identifier"
  type        = string
}

variable "elasticache_cluster_id" {
  description = "ElastiCache replication group identifier"
  type        = string
}

variable "alert_email" {
  description = "Email address to subscribe to the alarm topic"
  type        = string
}

variable "log_retention_days" {
  description = "Retention in days for application log groups"
  type        = number
  default     = 30
}
