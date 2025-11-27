# ============================================================================
# Canary Deployment Module Outputs
# ============================================================================

output "canary_target_group_arn" {
  description = "ARN of the canary target group"
  value       = aws_lb_target_group.canary.arn
}

output "canary_target_group_name" {
  description = "Name of the canary target group"
  value       = aws_lb_target_group.canary.name
}

output "canary_alert_topic_arn" {
  description = "ARN of the SNS topic for canary alerts"
  value       = aws_sns_topic.canary_alerts.arn
}

output "traffic_shifter_function_arn" {
  description = "ARN of the traffic shifter Lambda function"
  value       = aws_lambda_function.traffic_shifter.arn
}

output "traffic_shifter_function_name" {
  description = "Name of the traffic shifter Lambda function"
  value       = aws_lambda_function.traffic_shifter.function_name
}

output "canary_state_table_name" {
  description = "Name of the DynamoDB table for canary state management"
  value       = aws_dynamodb_table.canary_state.name
}

output "canary_state_table_arn" {
  description = "ARN of the DynamoDB table for canary state management"
  value       = aws_dynamodb_table.canary_state.arn
}

output "canary_dashboard_name" {
  description = "Name of the CloudWatch dashboard for canary monitoring"
  value       = aws_cloudwatch_dashboard.canary.dashboard_name
}

output "canary_error_alarm_name" {
  description = "Name of the CloudWatch alarm for canary error rate"
  value       = aws_cloudwatch_metric_alarm.canary_high_error_rate.alarm_name
}

output "canary_latency_alarm_name" {
  description = "Name of the CloudWatch alarm for canary latency"
  value       = aws_cloudwatch_metric_alarm.canary_high_response_time.alarm_name
}

output "canary_health_alarm_name" {
  description = "Name of the CloudWatch alarm for canary host health"
  value       = aws_cloudwatch_metric_alarm.canary_unhealthy_hosts.alarm_name
}

output "progression_rule_name" {
  description = "Name of the EventBridge rule for canary progression"
  value       = aws_cloudwatch_event_rule.canary_progression.name
}
