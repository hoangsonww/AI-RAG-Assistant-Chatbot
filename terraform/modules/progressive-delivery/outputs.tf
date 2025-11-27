# ============================================================================
# Progressive Delivery Module Outputs
# ============================================================================

output "state_machine_arn" {
  description = "ARN of the Step Functions state machine"
  value       = aws_sfn_state_machine.progressive_delivery.arn
}

output "state_machine_name" {
  description = "Name of the Step Functions state machine"
  value       = aws_sfn_state_machine.progressive_delivery.name
}

output "deployment_state_table_name" {
  description = "Name of the DynamoDB table for deployment state"
  value       = aws_dynamodb_table.deployment_state.name
}

output "notification_topic_arn" {
  description = "ARN of the SNS topic for notifications"
  value       = aws_sns_topic.deployment_notifications.arn
}

output "validator_function_arn" {
  description = "ARN of the deployment validator Lambda function"
  value       = aws_lambda_function.deployment_validator.arn
}

output "canary_deployer_function_arn" {
  description = "ARN of the canary deployer Lambda function"
  value       = aws_lambda_function.canary_deployer.arn
}

output "metrics_validator_function_arn" {
  description = "ARN of the metrics validator Lambda function"
  value       = aws_lambda_function.metrics_validator.arn
}
