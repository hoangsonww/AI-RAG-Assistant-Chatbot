# General Configuration
variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "lumina-ai.example.com"
}

variable "backend_domain" {
  description = "Custom domain name for the backend API"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ARN of ACM certificate for HTTPS"
  type        = string
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

# ALB Configuration
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
  description = "Path pattern used to route traffic to the backend service"
  type        = string
  default     = "/api/*"
}

# ECS Frontend Configuration
variable "frontend_image" {
  description = "Docker image for frontend application"
  type        = string
  default     = ""
}

variable "frontend_image_tag" {
  description = "Tag to use when pushing frontend images to the managed ECR repository"
  type        = string
  default     = "latest"
}

variable "frontend_cpu" {
  description = "CPU units for frontend container (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "frontend_memory" {
  description = "Memory for frontend container in MB"
  type        = number
  default     = 1024
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 2
}

variable "frontend_min_capacity" {
  description = "Minimum number of frontend tasks"
  type        = number
  default     = 2
}

variable "frontend_max_capacity" {
  description = "Maximum number of frontend tasks"
  type        = number
  default     = 10
}

# ECS Backend Configuration
variable "backend_image" {
  description = "Docker image for backend application"
  type        = string
  default     = ""
}

variable "backend_image_tag" {
  description = "Tag to use when pushing backend images to the managed ECR repository"
  type        = string
  default     = "latest"
}

variable "backend_cpu" {
  description = "CPU units for backend container (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "backend_memory" {
  description = "Memory for backend container in MB"
  type        = number
  default     = 2048
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 3
}

variable "backend_min_capacity" {
  description = "Minimum number of backend tasks"
  type        = number
  default     = 2
}

variable "backend_max_capacity" {
  description = "Maximum number of backend tasks"
  type        = number
  default     = 20
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for remote debugging"
  type        = bool
  default     = true
}

# DocumentDB Configuration
variable "documentdb_cluster_size" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 2
}

variable "documentdb_instance_class" {
  description = "Instance class for DocumentDB"
  type        = string
  default     = "db.r5.large"
}

variable "documentdb_master_username" {
  description = "Master username for DocumentDB"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "documentdb_master_password" {
  description = "Master password for DocumentDB"
  type        = string
  sensitive   = true
}

variable "documentdb_backup_retention" {
  description = "Number of days to retain DocumentDB backups"
  type        = number
  default     = 7
}

variable "documentdb_backup_window" {
  description = "Daily backup window for DocumentDB"
  type        = string
  default     = "07:00-09:00"
}

variable "documentdb_maintenance_window" {
  description = "Weekly maintenance window for DocumentDB"
  type        = string
  default     = "sun:05:00-sun:07:00"
}

variable "documentdb_deletion_protection" {
  description = "Enable deletion protection on the DocumentDB cluster"
  type        = bool
  default     = true
}

variable "documentdb_apply_immediately" {
  description = "Apply DocumentDB changes immediately"
  type        = bool
  default     = false
}

variable "documentdb_kms_key_id" {
  description = "KMS key ARN for DocumentDB encryption"
  type        = string
  default     = null
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "Node type for ElastiCache Redis"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

variable "redis_multi_az" {
  description = "Deploy Redis across multiple AZs"
  type        = bool
  default     = true
}

variable "redis_at_rest_encryption" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "redis_transit_encryption" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "redis_kms_key_id" {
  description = "KMS key ARN for Redis encryption"
  type        = string
  default     = null
}

variable "redis_auth_token" {
  description = "Redis AUTH token"
  type        = string
  default     = null
  sensitive   = true
}

variable "redis_maintenance_window" {
  description = "Weekly maintenance window for Redis"
  type        = string
  default     = "sun:06:00-sun:07:00"
}

variable "redis_snapshot_retention" {
  description = "Number of days to retain Redis snapshots"
  type        = number
  default     = 7
}

# Application Secrets
variable "jwt_secret" {
  description = "JWT secret for authentication"
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
  default     = "lumina-knowledge-base"
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# CloudFront Configuration
variable "enable_cloudfront_logging" {
  description = "Enable CloudFront access logging"
  type        = bool
  default     = true
}

variable "cloudfront_log_bucket_name" {
  description = "Optional existing S3 bucket to store CloudFront logs"
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}
