# ============================================================================
# Advanced Deployment Monitoring Module
# ============================================================================
# This module provides comprehensive monitoring for deployments including:
# - Real-time deployment metrics dashboards
# - DORA metrics tracking (deployment frequency, lead time, MTTR, change failure rate)
# - Custom deployment KPIs
# - Automated alerting
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
# CloudWatch Dashboard - Deployment Overview
# ============================================================================

resource "aws_cloudwatch_dashboard" "deployment_overview" {
  dashboard_name = "${var.project_name}-deployment-overview-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Deployment Frequency
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "DeploymentCount", { stat = "Sum", label = "Total Deployments" }],
            [".", "SuccessfulDeployments", { stat = "Sum", label = "Successful" }],
            [".", "FailedDeployments", { stat = "Sum", label = "Failed" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Deployment Frequency (24h)"
          period  = 86400
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },

      # Deployment Success Rate
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6

        properties = {
          metrics = [
            [{
              expression = "(m2/m1)*100"
              label      = "Success Rate %"
              id         = "e1"
            }],
            ["${var.project_name}/Deployments", "DeploymentCount", { id = "m1", visible = false }],
            [".", "SuccessfulDeployments", { id = "m2", visible = false }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Deployment Success Rate"
          period = 3600
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },

      # Mean Time to Recovery (MTTR)
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "RollbackTime", { stat = "Average", label = "Avg Rollback Time" }],
            ["...", { stat = "Maximum", label = "Max Rollback Time" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Mean Time to Recovery (MTTR)"
          period = 3600
          yAxis = {
            left = {
              label = "Minutes"
              min   = 0
            }
          }
        }
      },

      # Deployment Duration
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "DeploymentDuration", { stat = "Average", label = "Average Duration" }],
            ["...", { stat = "p99", label = "p99 Duration" }],
            ["...", { stat = "Maximum", label = "Maximum Duration" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Deployment Duration"
          period = 3600
          yAxis = {
            left = {
              label = "Minutes"
              min   = 0
            }
          }
        }
      },

      # Change Failure Rate
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            [{
              expression = "(m2/m1)*100"
              label      = "Change Failure Rate %"
              id         = "e1"
            }],
            ["${var.project_name}/Deployments", "DeploymentCount", { id = "m1", visible = false }],
            [".", "FailedDeployments", { id = "m2", visible = false }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Change Failure Rate"
          period = 3600
          annotations = {
            horizontal = [{
              label = "Target (< 5%)"
              value = 5
              fill  = "below"
            }]
          }
        }
      },

      # Canary Deployment Progress
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "CanaryTrafficPercentage", { stat = "Average", label = "Canary Traffic %" }],
            [".", "CanaryHealthScore", { stat = "Average", label = "Health Score" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Canary Deployment Progress"
          period = 300
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },

      # Rollback Events
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "RollbackCount", { stat = "Sum", label = "Total Rollbacks" }],
            [".", "AutoRollbackCount", { stat = "Sum", label = "Automatic Rollbacks" }],
            [".", "ManualRollbackCount", { stat = "Sum", label = "Manual Rollbacks" }]
          ]
          view    = "timeSeries"
          stacked = true
          region  = var.aws_region
          title   = "Rollback Events"
          period  = 3600
        }
      },

      # Lead Time for Changes
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "LeadTime", { stat = "Average", label = "Average Lead Time" }],
            ["...", { stat = "p50", label = "Median Lead Time" }],
            ["...", { stat = "p99", label = "p99 Lead Time" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Lead Time for Changes"
          period = 86400
          yAxis = {
            left = {
              label = "Hours"
              min   = 0
            }
          }
        }
      },

      # Service Health During Deployment
      {
        type   = "metric"
        x      = 12
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average", label = "Response Time" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "5XX Errors" }],
            [".", "HTTPCode_Target_2XX_Count", { stat = "Sum", label = "2XX Success" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Service Health During Deployment"
          period = 300
        }
      }
    ]
  })
}

# ============================================================================
# CloudWatch Dashboard - DORA Metrics
# ============================================================================

resource "aws_cloudwatch_dashboard" "dora_metrics" {
  dashboard_name = "${var.project_name}-dora-metrics-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Deployment Frequency (Daily)
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 8

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "DeploymentCount", { stat = "Sum", period = 86400 }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "DORA: Deployment Frequency (per day)"
          annotations = {
            horizontal = [{
              label = "Elite (Multiple per day)"
              value = 3
            }]
          }
        }
      },

      # Lead Time for Changes
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 8

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "LeadTime", { stat = "Average" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "DORA: Lead Time for Changes (hours)"
          annotations = {
            horizontal = [{
              label = "Elite (< 1 hour)"
              value = 1
            }, {
              label = "High (< 1 day)"
              value = 24
            }]
          }
        }
      },

      # Mean Time to Recovery
      {
        type   = "metric"
        x      = 0
        y      = 8
        width  = 12
        height = 8

        properties = {
          metrics = [
            ["${var.project_name}/Deployments", "RollbackTime", { stat = "Average" }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "DORA: Mean Time to Recovery (minutes)"
          annotations = {
            horizontal = [{
              label = "Elite (< 1 hour)"
              value = 60
            }, {
              label = "High (< 1 day)"
              value = 1440
            }]
          }
        }
      },

      # Change Failure Rate
      {
        type   = "metric"
        x      = 12
        y      = 8
        width  = 12
        height = 8

        properties = {
          metrics = [
            [{
              expression = "(m2/m1)*100"
              label      = "Change Failure Rate %"
              id         = "e1"
            }],
            ["${var.project_name}/Deployments", "DeploymentCount", { id = "m1", visible = false }],
            [".", "FailedDeployments", { id = "m2", visible = false }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "DORA: Change Failure Rate (%)"
          annotations = {
            horizontal = [{
              label = "Elite (< 5%)"
              value = 5
              fill  = "above"
            }, {
              label = "High (< 15%)"
              value = 15
              fill  = "above"
            }]
          }
        }
      }
    ]
  })
}

# ============================================================================
# Custom CloudWatch Metrics - Lambda for Publishing
# ============================================================================

data "archive_file" "metrics_publisher" {
  type        = "zip"
  output_path = "${path.module}/metrics-publisher.zip"

  source {
    content  = file("${path.module}/lambda/metrics-publisher.py")
    filename = "metrics-publisher.py"
  }
}

resource "aws_lambda_function" "metrics_publisher" {
  filename         = data.archive_file.metrics_publisher.output_path
  function_name    = "${var.project_name}-metrics-publisher-${var.environment}"
  role             = aws_iam_role.metrics_publisher.arn
  handler          = "metrics-publisher.lambda_handler"
  source_code_hash = data.archive_file.metrics_publisher.output_base64sha256
  runtime          = "python3.11"
  timeout          = 60

  environment {
    variables = {
      ENVIRONMENT  = var.environment
      PROJECT_NAME = var.project_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-metrics-publisher-${var.environment}"
    }
  )
}

resource "aws_iam_role" "metrics_publisher" {
  name = "${var.project_name}-metrics-publisher-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-metrics-publisher-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy" "metrics_publisher" {
  name = "${var.project_name}-metrics-publisher-policy-${var.environment}"
  role = aws_iam_role.metrics_publisher.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
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
          "codedeploy:GetDeployment",
          "codedeploy:ListDeployments",
          "ecs:DescribeServices",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# EventBridge Rule for Metrics Collection
# ============================================================================

resource "aws_cloudwatch_event_rule" "metrics_collection" {
  name                = "${var.project_name}-metrics-collection-${var.environment}"
  description         = "Trigger metrics collection"
  schedule_expression = "rate(5 minutes)"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-metrics-collection-${var.environment}"
    }
  )
}

resource "aws_cloudwatch_event_target" "metrics_collection" {
  rule      = aws_cloudwatch_event_rule.metrics_collection.name
  target_id = "MetricsPublisher"
  arn       = aws_lambda_function.metrics_publisher.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics_publisher.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.metrics_collection.arn
}

# ============================================================================
# CloudWatch Alarms for Deployment Health
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "high_failure_rate" {
  alarm_name          = "${var.project_name}-high-deployment-failure-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.failure_rate_threshold

  metric_query {
    id          = "e1"
    expression  = "(m2/m1)*100"
    label       = "Failure Rate"
    return_data = true
  }

  metric_query {
    id = "m1"
    metric {
      metric_name = "DeploymentCount"
      namespace   = "${var.project_name}/Deployments"
      period      = 3600
      stat        = "Sum"
    }
  }

  metric_query {
    id = "m2"
    metric {
      metric_name = "FailedDeployments"
      namespace   = "${var.project_name}/Deployments"
      period      = 3600
      stat        = "Sum"
    }
  }

  alarm_description = "Deployment failure rate is too high"
  alarm_actions     = [aws_sns_topic.deployment_alerts.arn]
  ok_actions        = [aws_sns_topic.deployment_alerts.arn]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-high-failure-rate-alarm-${var.environment}"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "slow_deployments" {
  alarm_name          = "${var.project_name}-slow-deployments-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DeploymentDuration"
  namespace           = "${var.project_name}/Deployments"
  period              = 3600
  statistic           = "Average"
  threshold           = var.deployment_duration_threshold
  alarm_description   = "Deployments are taking longer than expected"
  alarm_actions       = [aws_sns_topic.deployment_alerts.arn]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-slow-deployments-alarm-${var.environment}"
    }
  )
}

# ============================================================================
# SNS Topic for Alerts
# ============================================================================

resource "aws_sns_topic" "deployment_alerts" {
  name              = "${var.project_name}-deployment-alerts-${var.environment}"
  display_name      = "Deployment Alerts"
  kms_master_key_id = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-alerts-${var.environment}"
    }
  )
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.deployment_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============================================================================
# CloudWatch Log Insights Queries
# ============================================================================

resource "aws_cloudwatch_query_definition" "deployment_analysis" {
  name = "${var.project_name}-deployment-analysis-${var.environment}"

  log_group_names = [
    "/aws/codedeploy/${var.project_name}/${var.environment}",
    "/aws/states/${var.project_name}-progressive-delivery-${var.environment}"
  ]

  query_string = <<-QUERY
    fields @timestamp, @message
    | filter @message like /deployment/
    | stats count() as deployment_count by bin(5m)
    | sort @timestamp desc
  QUERY
}

resource "aws_cloudwatch_query_definition" "failed_deployments" {
  name = "${var.project_name}-failed-deployments-${var.environment}"

  log_group_names = [
    "/aws/codedeploy/${var.project_name}/${var.environment}"
  ]

  query_string = <<-QUERY
    fields @timestamp, @message
    | filter @message like /failed/ or @message like /error/
    | sort @timestamp desc
    | limit 100
  QUERY
}
