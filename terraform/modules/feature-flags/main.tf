# ============================================================================
# Feature Flags Module using AWS AppConfig
# ============================================================================
# This module implements a feature flag system for gradual rollouts using:
# - AWS AppConfig for configuration management
# - DynamoDB for flag state tracking
# - Lambda for flag evaluation
# - Progressive rollout strategies
# ============================================================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ============================================================================
# AppConfig Application
# ============================================================================

resource "aws_appconfig_application" "feature_flags" {
  name        = "${var.project_name}-feature-flags-${var.environment}"
  description = "Feature flags for ${var.project_name}"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-${var.environment}"
    }
  )
}

# ============================================================================
# AppConfig Environment
# ============================================================================

resource "aws_appconfig_environment" "main" {
  application_id = aws_appconfig_application.feature_flags.id
  name           = var.environment
  description    = "Feature flags environment for ${var.environment}"

  monitor {
    alarm_arn      = aws_cloudwatch_metric_alarm.feature_flag_errors.arn
    alarm_role_arn = aws_iam_role.appconfig_monitor.arn
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-env-${var.environment}"
    }
  )
}

# ============================================================================
# AppConfig Configuration Profile
# ============================================================================

resource "aws_appconfig_configuration_profile" "feature_flags" {
  application_id = aws_appconfig_application.feature_flags.id
  name           = "feature-flags"
  description    = "Feature flags configuration"
  location_uri   = "hosted"
  type           = "AWS.AppConfig.FeatureFlags"

  validator {
    type    = "JSON_SCHEMA"
    content = jsonencode({
      "$schema" = "http://json-schema.org/draft-07/schema#"
      type      = "object"
      properties = {
        flags = {
          type = "object"
          patternProperties = {
            ".*" = {
              type = "object"
              properties = {
                name = {
                  type = "string"
                }
                description = {
                  type = "string"
                }
                _deprecation = {
                  type   = "object"
                  properties = {
                    status = {
                      type = "string"
                      enum = ["planned", "deprecated"]
                    }
                  }
                }
                attributes = {
                  type = "object"
                }
              }
              required = ["name"]
            }
          }
        }
        values = {
          type = "object"
          patternProperties = {
            ".*" = {
              type = "object"
              properties = {
                enabled = {
                  type = "boolean"
                }
                rules = {
                  type  = "array"
                  items = {
                    type = "object"
                  }
                }
              }
              required = ["enabled"]
            }
          }
        }
      }
      required = ["flags", "values"]
    })
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-profile-${var.environment}"
    }
  )
}

# ============================================================================
# AppConfig Deployment Strategy - Canary
# ============================================================================

resource "aws_appconfig_deployment_strategy" "canary" {
  name                           = "${var.project_name}-canary-${var.environment}"
  description                    = "Canary deployment strategy for feature flags"
  deployment_duration_in_minutes = var.deployment_duration_minutes
  growth_factor                  = var.growth_factor
  replicate_to                   = "SSM_DOCUMENT"
  final_bake_time_in_minutes     = var.bake_time_minutes
  growth_type                    = "LINEAR"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-canary-strategy-${var.environment}"
    }
  )
}

# ============================================================================
# AppConfig Deployment Strategy - All at Once
# ============================================================================

resource "aws_appconfig_deployment_strategy" "all_at_once" {
  name                           = "${var.project_name}-all-at-once-${var.environment}"
  description                    = "Deploy feature flags to all targets immediately"
  deployment_duration_in_minutes = 0
  growth_factor                  = 100
  replicate_to                   = "NONE"
  final_bake_time_in_minutes     = 0
  growth_type                    = "LINEAR"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-all-at-once-strategy-${var.environment}"
    }
  )
}

# ============================================================================
# DynamoDB Table for Feature Flag State
# ============================================================================

resource "aws_dynamodb_table" "feature_flags" {
  name           = "${var.project_name}-feature-flags-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "flag_key"
  range_key      = "user_id"

  attribute {
    name = "flag_key"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "deployment_id"
    type = "S"
  }

  global_secondary_index {
    name            = "DeploymentIndex"
    hash_key        = "deployment_id"
    range_key       = "flag_key"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-${var.environment}"
    }
  )
}

# ============================================================================
# Lambda Function for Feature Flag Evaluation
# ============================================================================

data "archive_file" "flag_evaluator" {
  type        = "zip"
  output_path = "${path.module}/flag-evaluator.zip"

  source {
    content = file("${path.module}/lambda/flag-evaluator.py")
    filename = "flag-evaluator.py"
  }
}

resource "aws_lambda_function" "flag_evaluator" {
  filename         = data.archive_file.flag_evaluator.output_path
  function_name    = "${var.project_name}-flag-evaluator-${var.environment}"
  role             = aws_iam_role.flag_evaluator.arn
  handler          = "flag-evaluator.lambda_handler"
  source_code_hash = data.archive_file.flag_evaluator.output_base64sha256
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      APPCONFIG_APPLICATION = aws_appconfig_application.feature_flags.id
      APPCONFIG_ENVIRONMENT = aws_appconfig_environment.main.environment_id
      APPCONFIG_PROFILE     = aws_appconfig_configuration_profile.feature_flags.configuration_profile_id
      DYNAMODB_TABLE        = aws_dynamodb_table.feature_flags.name
      ENVIRONMENT           = var.environment
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-flag-evaluator-${var.environment}"
    }
  )
}

# Lambda layer for AppConfig extension
resource "aws_lambda_layer_version" "appconfig_extension" {
  filename            = "${path.module}/layers/appconfig-extension.zip"
  layer_name          = "${var.project_name}-appconfig-extension-${var.environment}"
  compatible_runtimes = ["python3.11", "python3.10", "python3.9"]
  description         = "AWS AppConfig Lambda Extension"
}

# ============================================================================
# IAM Role for Flag Evaluator Lambda
# ============================================================================

resource "aws_iam_role" "flag_evaluator" {
  name = "${var.project_name}-flag-evaluator-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-flag-evaluator-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy" "flag_evaluator" {
  name = "${var.project_name}-flag-evaluator-policy-${var.environment}"
  role = aws_iam_role.flag_evaluator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "appconfig:GetConfiguration",
          "appconfig:GetLatestConfiguration",
          "appconfig:StartConfigurationSession"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.feature_flags.arn,
          "${aws_dynamodb_table.feature_flags.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ============================================================================
# API Gateway for Feature Flag Service
# ============================================================================

resource "aws_apigatewayv2_api" "feature_flags" {
  name          = "${var.project_name}-feature-flags-${var.environment}"
  protocol_type = "HTTP"
  description   = "Feature flags API"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "x-api-key", "authorization"]
    max_age       = 300
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-api-${var.environment}"
    }
  )
}

resource "aws_apigatewayv2_stage" "feature_flags" {
  api_id      = aws_apigatewayv2_api.feature_flags.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      responseLength = "$context.responseLength"
    })
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-stage-${var.environment}"
    }
  )
}

resource "aws_apigatewayv2_integration" "flag_evaluator" {
  api_id             = aws_apigatewayv2_api.feature_flags.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.flag_evaluator.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "evaluate" {
  api_id    = aws_apigatewayv2_api.feature_flags.id
  route_key = "POST /evaluate"
  target    = "integrations/${aws_apigatewayv2_integration.flag_evaluator.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.flag_evaluator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.feature_flags.execution_arn}/*/*"
}

# ============================================================================
# CloudWatch Monitoring
# ============================================================================

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-feature-flags-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-api-logs-${var.environment}"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "feature_flag_errors" {
  alarm_name          = "${var.project_name}-feature-flags-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Feature flag evaluation errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.flag_evaluator.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-errors-${var.environment}"
    }
  )
}

# ============================================================================
# IAM Role for AppConfig Monitor
# ============================================================================

resource "aws_iam_role" "appconfig_monitor" {
  name = "${var.project_name}-appconfig-monitor-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "appconfig.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-appconfig-monitor-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy" "appconfig_monitor" {
  name = "${var.project_name}-appconfig-monitor-policy-${var.environment}"
  role = aws_iam_role.appconfig_monitor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:DescribeAlarms"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# SNS Topic for Alerts
# ============================================================================

resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-feature-flags-alerts-${var.environment}"
  display_name      = "Feature Flags Alerts"
  kms_master_key_id = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-feature-flags-alerts-${var.environment}"
    }
  )
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
