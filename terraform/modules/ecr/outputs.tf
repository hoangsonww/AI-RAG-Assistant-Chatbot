output "frontend_repository_url" {
  description = "ECR repository URL for the frontend image"
  value       = aws_ecr_repository.this["frontend"].repository_url
}

output "backend_repository_url" {
  description = "ECR repository URL for the backend image"
  value       = aws_ecr_repository.this["backend"].repository_url
}
