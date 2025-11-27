# ============================================================================
# Feature Flags Module Outputs
# ============================================================================

output "appconfig_application_id" {
  description = "ID of the AppConfig application"
  value       = aws_appconfig_application.feature_flags.id
}

output "appconfig_environment_id" {
  description = "ID of the AppConfig environment"
  value       = aws_appconfig_environment.main.environment_id
}

output "appconfig_profile_id" {
  description = "ID of the AppConfig configuration profile"
  value       = aws_appconfig_configuration_profile.feature_flags.configuration_profile_id
}

output "canary_strategy_id" {
  description = "ID of the canary deployment strategy"
  value       = aws_appconfig_deployment_strategy.canary.id
}

output "all_at_once_strategy_id" {
  description = "ID of the all-at-once deployment strategy"
  value       = aws_appconfig_deployment_strategy.all_at_once.id
}

output "feature_flags_table_name" {
  description = "Name of the DynamoDB table for feature flags"
  value       = aws_dynamodb_table.feature_flags.name
}

output "flag_evaluator_function_arn" {
  description = "ARN of the flag evaluator Lambda function"
  value       = aws_lambda_function.flag_evaluator.arn
}

output "api_endpoint" {
  description = "API Gateway endpoint for feature flags"
  value       = "${aws_apigatewayv2_api.feature_flags.api_endpoint}/${var.environment}"
}

output "api_id" {
  description = "ID of the API Gateway"
  value       = aws_apigatewayv2_api.feature_flags.id
}
