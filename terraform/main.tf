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

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  certificate_arn     = var.certificate_arn
}

# ECS Cluster Module
module "ecs" {
  source = "./modules/ecs"

  environment              = var.environment
  vpc_id                   = module.vpc.vpc_id
  private_subnet_ids       = module.vpc.private_subnet_ids
  alb_target_group_arn     = module.alb.target_group_arn
  alb_security_group_id    = module.alb.security_group_id

  # Frontend Configuration
  frontend_image           = var.frontend_image
  frontend_cpu             = var.frontend_cpu
  frontend_memory          = var.frontend_memory
  frontend_desired_count   = var.frontend_desired_count

  # Backend Configuration
  backend_image            = var.backend_image
  backend_cpu              = var.backend_cpu
  backend_memory           = var.backend_memory
  backend_desired_count    = var.backend_desired_count

  # Environment Variables
  mongodb_uri              = module.documentdb.connection_string
  redis_endpoint           = module.elasticache.redis_endpoint
  jwt_secret               = var.jwt_secret
  google_ai_api_key        = var.google_ai_api_key
  pinecone_api_key         = var.pinecone_api_key
  pinecone_index_name      = var.pinecone_index_name
}

# DocumentDB (MongoDB-compatible) Module
module "documentdb" {
  source = "./modules/documentdb"

  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.security_group_id

  cluster_size           = var.documentdb_cluster_size
  instance_class         = var.documentdb_instance_class
  master_username        = var.documentdb_master_username
  master_password        = var.documentdb_master_password
}

# ElastiCache (Redis) Module
module "elasticache" {
  source = "./modules/elasticache"

  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.ecs.security_group_id

  node_type              = var.redis_node_type
  num_cache_nodes        = var.redis_num_nodes
}

# CloudFront CDN Module
module "cloudfront" {
  source = "./modules/cloudfront"

  environment            = var.environment
  alb_dns_name           = module.alb.dns_name
  certificate_arn        = var.certificate_arn
  domain_name            = var.domain_name
}

# Monitoring and Alerting Module
module "monitoring" {
  source = "./modules/monitoring"

  environment            = var.environment
  ecs_cluster_name       = module.ecs.cluster_name
  alb_arn_suffix         = module.alb.arn_suffix
  documentdb_cluster_id  = module.documentdb.cluster_id
  elasticache_cluster_id = module.elasticache.cluster_id

  alert_email            = var.alert_email
}

# Outputs
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
