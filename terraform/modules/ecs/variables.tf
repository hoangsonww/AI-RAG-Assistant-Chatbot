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

variable "alb_target_group_arn" {
  description = "ALB target group ARN"
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

variable "backend_domain" {
  description = "Backend domain name"
  type        = string
  default     = "api.lumina-ai.example.com"
}

variable "mongodb_uri" {
  description = "MongoDB connection string"
  type        = string
  sensitive   = true
}

variable "redis_endpoint" {
  description = "Redis endpoint"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret"
  type        = string
  sensitive   = true
}

variable "google_ai_api_key" {
  description = "Google AI API key"
  type        = string
  sensitive   = true
}

variable "pinecone_api_key" {
  description = "Pinecone API key"
  type        = string
  sensitive   = true
}

variable "pinecone_index_name" {
  description = "Pinecone index name"
  type        = string
}
