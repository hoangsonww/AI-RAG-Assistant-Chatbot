# ============================================================================
# Progressive Delivery Pipeline Module
# ============================================================================
# This module implements a complete progressive delivery pipeline with:
# - Automated deployment progression
# - Multi-stage validation gates
# - Metrics-based promotion decisions
# - Integration with canary and blue/green deployments
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
# Step Functions State Machine for Progressive Delivery
# ============================================================================

resource "aws_sfn_state_machine" "progressive_delivery" {
  name     = "${var.project_name}-progressive-delivery-${var.environment}"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Progressive Delivery Pipeline with automated validation and promotion"
    StartAt = "ValidateDeployment"
    States = {
      ValidateDeployment = {
        Type     = "Task"
        Resource = aws_lambda_function.deployment_validator.arn
        Next     = "ValidationSuccessful"
        Catch = [
          {
            ErrorEquals = ["ValidationError"]
            Next        = "ValidationFailed"
          }
        ]
        Retry = [
          {
            ErrorEquals     = ["States.TaskFailed"]
            IntervalSeconds = 10
            MaxAttempts     = 3
            BackoffRate     = 2.0
          }
        ]
      }

      ValidationSuccessful = {
        Type = "Choice"
        Choices = [
          {
            Variable      = "$.validationResult.passed"
            BooleanEquals = true
            Next          = "DeployToCanary"
          }
        ]
        Default = "ValidationFailed"
      }

      DeployToCanary = {
        Type     = "Task"
        Resource = aws_lambda_function.canary_deployer.arn
        Next     = "WaitForCanaryStabilization"
        Catch = [
          {
            ErrorEquals = ["DeploymentError"]
            Next        = "RollbackDeployment"
          }
        ]
      }

      WaitForCanaryStabilization = {
        Type    = "Wait"
        Seconds = var.canary_stabilization_period
        Next    = "ValidateCanaryMetrics"
      }

      ValidateCanaryMetrics = {
        Type     = "Task"
        Resource = aws_lambda_function.metrics_validator.arn
        Next     = "CanaryMetricsCheck"
        Catch = [
          {
            ErrorEquals = ["MetricsError"]
            Next        = "RollbackDeployment"
          }
        ]
      }

      CanaryMetricsCheck = {
        Type = "Choice"
        Choices = [
          {
            Variable      = "$.metricsResult.healthy"
            BooleanEquals = true
            Next          = "ProgressCanaryTraffic"
          }
        ]
        Default = "RollbackDeployment"
      }

      ProgressCanaryTraffic = {
        Type     = "Task"
        Resource = aws_lambda_function.traffic_progresser.arn
        Next     = "CheckTrafficComplete"
        Catch = [
          {
            ErrorEquals = ["TrafficShiftError"]
            Next        = "RollbackDeployment"
          }
        ]
      }

      CheckTrafficComplete = {
        Type = "Choice"
        Choices = [
          {
            Variable      = "$.trafficResult.complete"
            BooleanEquals = true
            Next          = "CompleteDeployment"
          }
        ]
        Default = "WaitForNextStage"
      }

      WaitForNextStage = {
        Type    = "Wait"
        Seconds = var.stage_duration
        Next    = "ValidateCanaryMetrics"
      }

      CompleteDeployment = {
        Type     = "Task"
        Resource = aws_lambda_function.deployment_completer.arn
        Next     = "NotifySuccess"
      }

      NotifySuccess = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.deployment_notifications.arn
          Subject  = "Progressive Delivery Completed Successfully"
          Message = {
            "status"        = "success"
            "deployment_id" = "$.deploymentId"
            "service"       = "$.service"
            "version"       = "$.version"
          }
        }
        Next = "DeploymentSucceeded"
      }

      DeploymentSucceeded = {
        Type = "Succeed"
      }

      RollbackDeployment = {
        Type     = "Task"
        Resource = aws_lambda_function.deployment_rollback.arn
        Next     = "NotifyFailure"
      }

      NotifyFailure = {
        Type     = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn = aws_sns_topic.deployment_notifications.arn
          Subject  = "Progressive Delivery Failed - Rolled Back"
          Message = {
            "status"        = "failed"
            "deployment_id" = "$.deploymentId"
            "service"       = "$.service"
            "reason"        = "$.error"
          }
        }
        Next = "DeploymentFailed"
      }

      DeploymentFailed = {
        Type = "Fail"
      }

      ValidationFailed = {
        Type = "Fail"
        Error = "DeploymentValidationFailed"
        Cause = "Pre-deployment validation checks failed"
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.step_functions.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-progressive-delivery-${var.environment}"
    }
  )
}

# ============================================================================
# IAM Role for Step Functions
# ============================================================================

resource "aws_iam_role" "step_functions" {
  name = "${var.project_name}-progressive-delivery-sf-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-progressive-delivery-sf-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy" "step_functions" {
  name = "${var.project_name}-progressive-delivery-sf-policy-${var.environment}"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.deployment_validator.arn,
          aws_lambda_function.canary_deployer.arn,
          aws_lambda_function.metrics_validator.arn,
          aws_lambda_function.traffic_progresser.arn,
          aws_lambda_function.deployment_completer.arn,
          aws_lambda_function.deployment_rollback.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.deployment_notifications.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# Lambda Functions for Pipeline Stages
# ============================================================================

# Deployment Validator
resource "aws_lambda_function" "deployment_validator" {
  filename         = "${path.module}/lambda/validator.zip"
  function_name    = "${var.project_name}-deployment-validator-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "validator.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/validator.zip")
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-validator-${var.environment}"
    }
  )
}

# Canary Deployer
resource "aws_lambda_function" "canary_deployer" {
  filename         = "${path.module}/lambda/canary-deployer.zip"
  function_name    = "${var.project_name}-canary-deployer-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "canary-deployer.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/canary-deployer.zip")
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-canary-deployer-${var.environment}"
    }
  )
}

# Metrics Validator
resource "aws_lambda_function" "metrics_validator" {
  filename         = "${path.module}/lambda/metrics-validator.zip"
  function_name    = "${var.project_name}-metrics-validator-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "metrics-validator.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/metrics-validator.zip")
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      ERROR_RATE_THRESHOLD     = var.error_rate_threshold
      LATENCY_THRESHOLD        = var.latency_threshold
      SUCCESS_RATE_THRESHOLD   = var.success_rate_threshold
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-metrics-validator-${var.environment}"
    }
  )
}

# Traffic Progresser
resource "aws_lambda_function" "traffic_progresser" {
  filename         = "${path.module}/lambda/traffic-progresser.zip"
  function_name    = "${var.project_name}-traffic-progresser-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "traffic-progresser.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/traffic-progresser.zip")
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      ENVIRONMENT     = var.environment
      TRAFFIC_STAGES  = jsonencode(var.traffic_stages)
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-traffic-progresser-${var.environment}"
    }
  )
}

# Deployment Completer
resource "aws_lambda_function" "deployment_completer" {
  filename         = "${path.module}/lambda/deployment-completer.zip"
  function_name    = "${var.project_name}-deployment-completer-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "deployment-completer.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/deployment-completer.zip")
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-completer-${var.environment}"
    }
  )
}

# Deployment Rollback
resource "aws_lambda_function" "deployment_rollback" {
  filename         = "${path.module}/lambda/deployment-rollback.zip"
  function_name    = "${var.project_name}-deployment-rollback-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "deployment-rollback.lambda_handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/deployment-rollback.zip")
  runtime          = "python3.11"
  timeout          = 300

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-rollback-${var.environment}"
    }
  )
}

# ============================================================================
# IAM Role for Lambda Functions
# ============================================================================

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-progressive-delivery-lambda-${var.environment}"

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
      Name = "${var.project_name}-progressive-delivery-lambda-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy" "lambda_execution" {
  name = "${var.project_name}-progressive-delivery-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:*",
          "elasticloadbalancing:*",
          "cloudwatch:*",
          "codedeploy:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.deployment_state.arn
      }
    ]
  })
}

# ============================================================================
# DynamoDB Table for Deployment State
# ============================================================================

resource "aws_dynamodb_table" "deployment_state" {
  name           = "${var.project_name}-progressive-delivery-state-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "deployment_id"
  range_key      = "timestamp"

  attribute {
    name = "deployment_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "timestamp"
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
      Name = "${var.project_name}-progressive-delivery-state-${var.environment}"
    }
  )
}

# ============================================================================
# SNS Topic for Notifications
# ============================================================================

resource "aws_sns_topic" "deployment_notifications" {
  name              = "${var.project_name}-progressive-delivery-notifications-${var.environment}"
  display_name      = "Progressive Delivery Notifications"
  kms_master_key_id = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-progressive-delivery-notifications-${var.environment}"
    }
  )
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.deployment_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# ============================================================================
# CloudWatch Log Groups
# ============================================================================

resource "aws_cloudwatch_log_group" "step_functions" {
  name              = "/aws/states/${var.project_name}-progressive-delivery-${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-progressive-delivery-sf-logs-${var.environment}"
    }
  )
}

# ============================================================================
# EventBridge Rule for Automatic Execution
# ============================================================================

resource "aws_cloudwatch_event_rule" "deployment_trigger" {
  count       = var.enable_automatic_execution ? 1 : 0
  name        = "${var.project_name}-progressive-delivery-trigger-${var.environment}"
  description = "Trigger progressive delivery pipeline"

  event_pattern = jsonencode({
    source      = ["aws.ecr"]
    detail-type = ["ECR Image Action"]
    detail = {
      action-type = ["PUSH"]
      result      = ["SUCCESS"]
    }
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-progressive-delivery-trigger-${var.environment}"
    }
  )
}

resource "aws_cloudwatch_event_target" "step_functions" {
  count     = var.enable_automatic_execution ? 1 : 0
  rule      = aws_cloudwatch_event_rule.deployment_trigger[0].name
  target_id = "StepFunctionsStateMachine"
  arn       = aws_sfn_state_machine.progressive_delivery.arn
  role_arn  = aws_iam_role.eventbridge.arn
}

resource "aws_iam_role" "eventbridge" {
  count = var.enable_automatic_execution ? 1 : 0
  name  = "${var.project_name}-progressive-delivery-eventbridge-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-progressive-delivery-eventbridge-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy" "eventbridge" {
  count = var.enable_automatic_execution ? 1 : 0
  name  = "${var.project_name}-progressive-delivery-eventbridge-policy-${var.environment}"
  role  = aws_iam_role.eventbridge[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:StartExecution"
        ]
        Resource = aws_sfn_state_machine.progressive_delivery.arn
      }
    ]
  })
}
