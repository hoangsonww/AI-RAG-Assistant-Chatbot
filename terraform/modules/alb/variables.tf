variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "VPC identifier"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
}

variable "frontend_health_check_path" {
  description = "Health check path for the frontend target group"
  type        = string
  default     = "/"
}

variable "backend_health_check_path" {
  description = "Health check path for the backend target group"
  type        = string
  default     = "/health"
}

variable "backend_path_pattern" {
  description = "Path pattern to route to the backend service"
  type        = string
  default     = "/api/*"
}
