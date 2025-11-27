# ============================================================================
# Deployment Monitoring Module Outputs
# ============================================================================

output "deployment_overview_dashboard_name" {
  description = "Name of the deployment overview dashboard"
  value       = aws_cloudwatch_dashboard.deployment_overview.dashboard_name
}

output "dora_metrics_dashboard_name" {
  description = "Name of the DORA metrics dashboard"
  value       = aws_cloudwatch_dashboard.dora_metrics.dashboard_name
}

output "metrics_publisher_function_arn" {
  description = "ARN of the metrics publisher Lambda"
  value       = aws_lambda_function.metrics_publisher.arn
}

output "deployment_alerts_topic_arn" {
  description = "ARN of the deployment alerts SNS topic"
  value       = aws_sns_topic.deployment_alerts.arn
}
