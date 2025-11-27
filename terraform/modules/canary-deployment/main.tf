# ============================================================================
# Canary Deployment Module with Progressive Traffic Shifting
# ============================================================================
# This module implements advanced canary deployments with:
# - Automated traffic shifting in configurable increments
# - Health check validation at each stage
# - Automated rollback on failures
# - Metrics-based promotion decisions
# - A/B testing support
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
# Additional Target Groups for Canary
# ============================================================================

resource "aws_lb_target_group" "canary" {
  name        = "${var.project_name}-${var.service_name}-canary-${var.environment}"
  port        = var.service_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    timeout             = var.health_check_timeout
    interval            = var.health_check_interval
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = var.health_check_matcher
  }

  deregistration_delay = 30

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-canary-${var.environment}"
      ServiceType = var.service_name
      Deployment  = "Canary"
    }
  )
}

# ============================================================================
# CloudWatch Alarms for Canary Health
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "canary_high_error_rate" {
  alarm_name          = "${var.project_name}-${var.service_name}-canary-high-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.error_rate_evaluation_periods
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = var.error_rate_period
  statistic           = "Sum"
  threshold           = var.error_rate_threshold
  alarm_description   = "Canary deployment has high error rate"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.canary_alerts.arn]
  ok_actions    = [aws_sns_topic.canary_alerts.arn]

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-canary-error-alarm-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "canary_high_response_time" {
  alarm_name          = "${var.project_name}-${var.service_name}-canary-high-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.latency_evaluation_periods
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = var.latency_period
  statistic           = "Average"
  threshold           = var.latency_threshold
  alarm_description   = "Canary deployment has high response time"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.canary_alerts.arn]
  ok_actions    = [aws_sns_topic.canary_alerts.arn]

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-canary-latency-alarm-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "canary_unhealthy_hosts" {
  alarm_name          = "${var.project_name}-${var.service_name}-canary-unhealthy-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Canary deployment has unhealthy hosts"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.canary_alerts.arn]
  ok_actions    = [aws_sns_topic.canary_alerts.arn]

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-canary-health-alarm-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

# ============================================================================
# SNS Topic for Canary Alerts
# ============================================================================

resource "aws_sns_topic" "canary_alerts" {
  name              = "${var.project_name}-${var.service_name}-canary-alerts-${var.environment}"
  display_name      = "Canary Deployment Alerts - ${var.service_name}"
  kms_master_key_id = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-canary-alerts-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

resource "aws_sns_topic_subscription" "canary_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.canary_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================================================
# Lambda Function for Automated Traffic Shifting
# ============================================================================

data "archive_file" "traffic_shifter" {
  type        = "zip"
  output_path = "${path.module}/traffic-shifter.zip"

  source {
    content  = file("${path.module}/lambda/traffic-shifter.py")
    filename = "traffic-shifter.py"
  }
}

resource "aws_lambda_function" "traffic_shifter" {
  filename         = data.archive_file.traffic_shifter.output_path
  function_name    = "${var.project_name}-${var.service_name}-traffic-shifter-${var.environment}"
  role             = aws_iam_role.traffic_shifter.arn
  handler          = "traffic-shifter.lambda_handler"
  source_code_hash = data.archive_file.traffic_shifter.output_base64sha256
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 256

  environment {
    variables = {
      LISTENER_ARN           = var.listener_arn
      PRODUCTION_TG_ARN      = var.production_target_group_arn
      CANARY_TG_ARN          = aws_lb_target_group.canary.arn
      CANARY_STAGES          = jsonencode(var.canary_traffic_stages)
      STAGE_DURATION_MINUTES = var.stage_duration_minutes
      ALARM_NAMES            = jsonencode([
        aws_cloudwatch_metric_alarm.canary_high_error_rate.alarm_name,
        aws_cloudwatch_metric_alarm.canary_high_response_time.alarm_name,
        aws_cloudwatch_metric_alarm.canary_unhealthy_hosts.alarm_name
      ])
      SNS_TOPIC_ARN          = aws_sns_topic.canary_alerts.arn
      AUTO_ROLLBACK_ENABLED  = var.auto_rollback_enabled
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-traffic-shifter-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

# IAM role for Lambda function
resource "aws_iam_role" "traffic_shifter" {
  name = "${var.project_name}-${var.service_name}-traffic-shifter-${var.environment}"

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
      Name        = "${var.project_name}-${var.service_name}-traffic-shifter-role-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

resource "aws_iam_role_policy" "traffic_shifter" {
  name = "${var.project_name}-${var.service_name}-traffic-shifter-policy-${var.environment}"
  role = aws_iam_role.traffic_shifter.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:ModifyListener",
          "elasticloadbalancing:ModifyRule",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:DescribeAlarms",
          "cloudwatch:GetMetricStatistics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.canary_alerts.arn
      },
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
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.canary_state.arn
      }
    ]
  })
}

# ============================================================================
# DynamoDB Table for Canary State Management
# ============================================================================

resource "aws_dynamodb_table" "canary_state" {
  name           = "${var.project_name}-${var.service_name}-canary-state-${var.environment}"
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
      Name        = "${var.project_name}-${var.service_name}-canary-state-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

# ============================================================================
# EventBridge Rule for Automated Progression
# ============================================================================

resource "aws_cloudwatch_event_rule" "canary_progression" {
  name                = "${var.project_name}-${var.service_name}-canary-progression-${var.environment}"
  description         = "Trigger traffic shifting for canary deployments"
  schedule_expression = "rate(${var.stage_duration_minutes} minutes)"
  is_enabled          = var.enable_auto_progression

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-canary-progression-${var.environment}"
      ServiceType = var.service_name
    }
  )
}

resource "aws_cloudwatch_event_target" "canary_progression" {
  rule      = aws_cloudwatch_event_rule.canary_progression.name
  target_id = "TrafficShifterLambda"
  arn       = aws_lambda_function.traffic_shifter.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.traffic_shifter.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.canary_progression.arn
}

# ============================================================================
# CloudWatch Dashboard for Canary Monitoring
# ============================================================================

resource "aws_cloudwatch_dashboard" "canary" {
  dashboard_name = "${var.project_name}-${var.service_name}-canary-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average", label = "Canary Response Time" }],
            ["...", { stat = "p99", label = "Canary p99" }]
          ]
          view    = "timeSeries"
          region  = var.aws_region
          title   = "Canary Response Time"
          period  = 60
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "Canary 5XX Errors" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum", label = "Canary 4XX Errors" }]
          ]
          view    = "timeSeries"
          region  = var.aws_region
          title   = "Canary Error Count"
          period  = 60
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", { stat = "Average", label = "Healthy Hosts" }],
            [".", "UnHealthyHostCount", { stat = "Average", label = "Unhealthy Hosts" }]
          ]
          view    = "timeSeries"
          region  = var.aws_region
          title   = "Canary Host Health"
          period  = 60
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum", label = "Request Count" }]
          ]
          view    = "timeSeries"
          region  = var.aws_region
          title   = "Canary Traffic"
          period  = 60
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      }
    ]
  })
}

# ============================================================================
# CloudWatch Log Group for Lambda
# ============================================================================

resource "aws_cloudwatch_log_group" "traffic_shifter" {
  name              = "/aws/lambda/${aws_lambda_function.traffic_shifter.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.service_name}-traffic-shifter-logs-${var.environment}"
      ServiceType = var.service_name
    }
  )
}
