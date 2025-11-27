# ============================================================================
# AWS CodeDeploy Module Outputs
# ============================================================================

output "codedeploy_app_name" {
  description = "Name of the CodeDeploy application"
  value       = aws_codedeploy_app.ecs_app.name
}

output "codedeploy_app_id" {
  description = "ID of the CodeDeploy application"
  value       = aws_codedeploy_app.ecs_app.id
}

output "frontend_deployment_group_name" {
  description = "Name of the frontend deployment group"
  value       = var.enable_frontend_deployment ? aws_codedeploy_deployment_group.frontend[0].deployment_group_name : null
}

output "frontend_deployment_group_id" {
  description = "ID of the frontend deployment group"
  value       = var.enable_frontend_deployment ? aws_codedeploy_deployment_group.frontend[0].id : null
}

output "backend_deployment_group_name" {
  description = "Name of the backend deployment group"
  value       = var.enable_backend_deployment ? aws_codedeploy_deployment_group.backend[0].deployment_group_name : null
}

output "backend_deployment_group_id" {
  description = "ID of the backend deployment group"
  value       = var.enable_backend_deployment ? aws_codedeploy_deployment_group.backend[0].id : null
}

output "codedeploy_role_arn" {
  description = "ARN of the CodeDeploy IAM role"
  value       = aws_iam_role.codedeploy.arn
}

output "deployment_notification_topic_arn" {
  description = "ARN of the SNS topic for deployment notifications"
  value       = aws_sns_topic.deployment_notifications.arn
}

output "deployment_log_group_name" {
  description = "Name of the CloudWatch log group for deployments"
  value       = aws_cloudwatch_log_group.deployment_logs.name
}

output "deployment_artifacts_bucket_name" {
  description = "Name of the S3 bucket for deployment artifacts"
  value       = var.create_deployment_bucket ? aws_s3_bucket.deployment_artifacts[0].id : null
}

output "deployment_artifacts_bucket_arn" {
  description = "ARN of the S3 bucket for deployment artifacts"
  value       = var.create_deployment_bucket ? aws_s3_bucket.deployment_artifacts[0].arn : null
}
