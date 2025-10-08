output "alert_topic_arn" {
  description = "SNS topic ARN for operational alerts"
  value       = aws_sns_topic.alerts.arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.lumina.dashboard_name
}
