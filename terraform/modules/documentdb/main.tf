locals {
  encoded_password = urlencode(var.master_password)
}

resource "aws_security_group" "documentdb" {
  name        = "${var.environment}-lumina-documentdb-sg"
  description = "Security group for DocumentDB cluster"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "${var.environment}-lumina-documentdb-sg"
  }
}

resource "aws_docdb_subnet_group" "this" {
  name       = "${var.environment}-lumina-documentdb-subnets"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.environment}-lumina-documentdb-subnets"
  }
}

resource "aws_docdb_cluster_parameter_group" "this" {
  family = "docdb5.0"
  name   = "${var.environment}-lumina-documentdb-params"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  tags = {
    Name = "${var.environment}-lumina-documentdb-params"
  }
}

resource "aws_docdb_cluster" "this" {
  cluster_identifier              = "${var.environment}-lumina-documentdb"
  engine                          = "docdb"
  master_username                 = var.master_username
  master_password                 = var.master_password
  backup_retention_period         = var.backup_retention_period
  preferred_backup_window         = var.preferred_backup_window
  preferred_maintenance_window    = var.preferred_maintenance_window
  db_subnet_group_name            = aws_docdb_subnet_group.this.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.this.name
  vpc_security_group_ids          = [aws_security_group.documentdb.id]
  deletion_protection             = var.deletion_protection
  apply_immediately               = var.apply_immediately
  storage_encrypted               = true
  kms_key_id                      = var.kms_key_id
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Name = "${var.environment}-lumina-documentdb"
  }
}

resource "aws_docdb_cluster_instance" "this" {
  count              = var.cluster_size
  identifier         = "${var.environment}-lumina-documentdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.this.id
  instance_class     = var.instance_class
  apply_immediately  = var.apply_immediately
  promotion_tier     = count.index + 1

  tags = {
    Name = "${var.environment}-lumina-documentdb-${count.index + 1}"
  }
}

locals {
  connection_string = "mongodb://${var.master_username}:${local.encoded_password}@${aws_docdb_cluster.this.endpoint}:27017/admin?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&tls=true"
}

output "connection_string" {
  description = "MongoDB connection string for the cluster"
  value       = local.connection_string
  sensitive   = true
}
