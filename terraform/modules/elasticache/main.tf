resource "aws_security_group" "elasticache" {
  name        = "${var.environment}-lumina-elasticache-sg"
  description = "Security group for ElastiCache"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "${var.environment}-lumina-elasticache-sg"
  }
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.environment}-lumina-elasticache-subnets"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.environment}-lumina-elasticache-subnets"
  }
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.environment}-lumina-elasticache-params"
  family = var.parameter_group_family

  parameter {
    name  = "notify-keyspace-events"
    value = "gKxe"
  }

  tags = {
    Name = "${var.environment}-lumina-elasticache-params"
  }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id          = "${var.environment}-lumina-redis"
  replication_group_description = "Redis replication group for Lumina"
  node_type                     = var.node_type
  number_cache_clusters         = var.num_cache_nodes
  subnet_group_name             = aws_elasticache_subnet_group.this.name
  parameter_group_name          = aws_elasticache_parameter_group.this.name
  security_group_ids            = [aws_security_group.elasticache.id]
  engine                        = "redis"
  engine_version                = var.engine_version
  automatic_failover_enabled    = var.automatic_failover_enabled
  multi_az_enabled              = var.multi_az_enabled
  at_rest_encryption_enabled    = var.at_rest_encryption_enabled
  transit_encryption_enabled    = var.transit_encryption_enabled
  kms_key_id                    = var.kms_key_id
  auth_token                    = var.auth_token
  maintenance_window            = var.maintenance_window
  snapshot_retention_limit      = var.snapshot_retention_limit
  apply_immediately             = false

  tags = {
    Name = "${var.environment}-lumina-redis"
  }
}

locals {
  redis_endpoint = var.transit_encryption_enabled ? "rediss://${aws_elasticache_replication_group.this.primary_endpoint_address}:6379" : "redis://${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
}
