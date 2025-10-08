output "cluster_id" {
  description = "DocumentDB cluster identifier"
  value       = aws_docdb_cluster.this.id
}

output "endpoint" {
  description = "Primary endpoint for the DocumentDB cluster"
  value       = aws_docdb_cluster.this.endpoint
  sensitive   = true
}

output "reader_endpoint" {
  description = "Reader endpoint for the DocumentDB cluster"
  value       = aws_docdb_cluster.this.reader_endpoint
  sensitive   = true
}

output "security_group_id" {
  description = "Security group ID associated with the DocumentDB cluster"
  value       = aws_security_group.documentdb.id
}

output "connection_string" {
  description = "MongoDB connection string"
  value       = local.connection_string
  sensitive   = true
}
