terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "lumina-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "lumina-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Lumina-AI-Assistant"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps-Team"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

module "vpc" {
  source = "./modules/vpc"

  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = data.aws_availability_zones.available.names
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
}

module "ecr" {
  source      = "./modules/ecr"
  environment = var.environment
}

locals {
  resolved_frontend_image = var.frontend_image != "" ? var.frontend_image : "${module.ecr.frontend_repository_url}:${var.frontend_image_tag}"
  resolved_backend_image  = var.backend_image != "" ? var.backend_image : "${module.ecr.backend_repository_url}:${var.backend_image_tag}"
  resolved_backend_domain = var.backend_domain != "" ? var.backend_domain : "api.${var.domain_name}"
}

module "documentdb" {
  source = "./modules/documentdb"

  environment                 = var.environment
  vpc_id                      = module.vpc.vpc_id
  private_subnet_ids          = module.vpc.private_subnet_ids
  cluster_size                = var.documentdb_cluster_size
  instance_class              = var.documentdb_instance_class
  master_username             = var.documentdb_master_username
  master_password             = var.documentdb_master_password
  backup_retention_period     = var.documentdb_backup_retention
  preferred_backup_window     = var.documentdb_backup_window
  preferred_maintenance_window = var.documentdb_maintenance_window
  deletion_protection         = var.documentdb_deletion_protection
  apply_immediately           = var.documentdb_apply_immediately
  kms_key_id                  = var.documentdb_kms_key_id
}

module "elasticache" {
  source = "./modules/elasticache"

  environment                 = var.environment
  vpc_id                      = module.vpc.vpc_id
  private_subnet_ids          = module.vpc.private_subnet_ids
  node_type                   = var.redis_node_type
  num_cache_nodes             = var.redis_num_nodes
  engine_version              = var.redis_engine_version
  parameter_group_family      = var.redis_parameter_group_family
  automatic_failover_enabled  = var.redis_automatic_failover
  multi_az_enabled            = var.redis_multi_az
  at_rest_encryption_enabled  = var.redis_at_rest_encryption
  transit_encryption_enabled  = var.redis_transit_encryption
  kms_key_id                  = var.redis_kms_key_id
  auth_token                  = var.redis_auth_token
  maintenance_window          = var.redis_maintenance_window
  snapshot_retention_limit    = var.redis_snapshot_retention
}

resource "aws_secretsmanager_secret" "backend_env" {
  name = "${var.environment}/lumina/backend"
}

resource "aws_secretsmanager_secret_version" "backend_env" {
  secret_id     = aws_secretsmanager_secret.backend_env.id
  secret_string = jsonencode({
    MONGODB_URI       = module.documentdb.connection_string,
    REDIS_ENDPOINT    = module.elasticache.redis_endpoint,
    JWT_SECRET        = var.jwt_secret,
    GOOGLE_AI_API_KEY = var.google_ai_api_key,
    PINECONE_API_KEY  = var.pinecone_api_key
  })
}

module "alb" {
  source = "./modules/alb"

  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  public_subnet_ids       = module.vpc.public_subnet_ids
  certificate_arn         = var.certificate_arn
  frontend_health_check_path = var.frontend_health_check_path
  backend_health_check_path  = var.backend_health_check_path
  backend_path_pattern       = var.backend_path_pattern
}

module "ecs" {
  source = "./modules/ecs"

  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  backend_target_group_arn  = module.alb.backend_target_group_arn
  alb_security_group_id     = module.alb.security_group_id
  frontend_image            = local.resolved_frontend_image
  frontend_cpu              = var.frontend_cpu
  frontend_memory           = var.frontend_memory
  frontend_desired_count    = var.frontend_desired_count
  frontend_min_capacity     = var.frontend_min_capacity
  frontend_max_capacity     = var.frontend_max_capacity
  backend_image             = local.resolved_backend_image
  backend_cpu               = var.backend_cpu
  backend_memory            = var.backend_memory
  backend_desired_count     = var.backend_desired_count
  backend_min_capacity      = var.backend_min_capacity
  backend_max_capacity      = var.backend_max_capacity
  backend_domain            = local.resolved_backend_domain
  backend_env_secret_arn    = aws_secretsmanager_secret.backend_env.arn
  pinecone_index_name       = var.pinecone_index_name
  enable_execute_command    = var.enable_execute_command
  log_retention_days        = var.log_retention_days
}

resource "aws_security_group_rule" "documentdb_from_ecs" {
  description              = "Allow ECS tasks to connect to DocumentDB"
  type                     = "ingress"
  from_port                = 27017
  to_port                  = 27017
  protocol                 = "tcp"
  security_group_id        = module.documentdb.security_group_id
  source_security_group_id = module.ecs.security_group_id
}

resource "aws_security_group_rule" "elasticache_from_ecs" {
  description              = "Allow ECS tasks to connect to Redis"
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = module.elasticache.security_group_id
  source_security_group_id = module.ecs.security_group_id
}

module "cloudfront" {
  source = "./modules/cloudfront"

  environment     = var.environment
  alb_dns_name    = module.alb.dns_name
  certificate_arn = var.certificate_arn
  domain_name     = var.domain_name
  enable_logging  = var.enable_cloudfront_logging
  log_bucket_name = var.cloudfront_log_bucket_name
  price_class     = var.cloudfront_price_class
}

module "monitoring" {
  source = "./modules/monitoring"

  environment            = var.environment
  ecs_cluster_name       = module.ecs.cluster_name
  frontend_service_name  = module.ecs.frontend_service_name
  backend_service_name   = module.ecs.backend_service_name
  alb_arn_suffix         = module.alb.arn_suffix
  documentdb_cluster_id  = module.documentdb.cluster_id
  elasticache_cluster_id = module.elasticache.cluster_id
  alert_email            = var.alert_email
  log_retention_days     = var.log_retention_days
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "frontend_ecr_repository_url" {
  description = "ECR repository URL for the frontend image"
  value       = module.ecr.frontend_repository_url
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for the backend image"
  value       = module.ecr.backend_repository_url
}

output "monitoring_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = module.monitoring.dashboard_name
}
