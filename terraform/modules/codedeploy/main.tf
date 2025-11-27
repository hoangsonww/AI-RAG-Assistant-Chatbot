# ============================================================================
# AWS CodeDeploy Module for ECS Blue/Green Deployments
# ============================================================================
# This module configures AWS CodeDeploy for automated blue/green deployments
# with traffic shifting, automated rollback, and deployment validation.
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
# IAM Role for CodeDeploy
# ============================================================================

resource "aws_iam_role" "codedeploy" {
  name = "${var.project_name}-codedeploy-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codedeploy.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-codedeploy-role-${var.environment}"
    }
  )
}

# Attach AWS managed policy for ECS deployments
resource "aws_iam_role_policy_attachment" "codedeploy_ecs" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS"
}

# Additional policy for full blue/green deployment capabilities
resource "aws_iam_role_policy" "codedeploy_additional" {
  name = "${var.project_name}-codedeploy-policy-${var.environment}"
  role = aws_iam_role.codedeploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:CreateTaskSet",
          "ecs:UpdateServicePrimaryTaskSet",
          "ecs:DeleteTaskSet",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:ModifyListener",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:ModifyRule",
          "lambda:InvokeFunction",
          "cloudwatch:DescribeAlarms",
          "sns:Publish",
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "*"
      }
    ]
  })
}

# ============================================================================
# SNS Topic for Deployment Notifications
# ============================================================================

resource "aws_sns_topic" "deployment_notifications" {
  name              = "${var.project_name}-deployments-${var.environment}"
  display_name      = "Deployment Notifications for ${var.project_name}"
  kms_master_key_id = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-notifications-${var.environment}"
    }
  )
}

resource "aws_sns_topic_subscription" "deployment_email" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.deployment_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# ============================================================================
# CodeDeploy Application
# ============================================================================

resource "aws_codedeploy_app" "ecs_app" {
  name             = "${var.project_name}-${var.environment}"
  compute_platform = "ECS"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-codedeploy-app-${var.environment}"
    }
  )
}

# ============================================================================
# CodeDeploy Deployment Group - Frontend
# ============================================================================

resource "aws_codedeploy_deployment_group" "frontend" {
  count = var.enable_frontend_deployment ? 1 : 0

  app_name               = aws_codedeploy_app.ecs_app.name
  deployment_group_name  = "frontend-${var.environment}"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = var.frontend_deployment_config

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  blue_green_deployment_config {
    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = var.blue_termination_wait_time
    }

    deployment_ready_option {
      action_on_timeout = var.deployment_ready_action
      wait_time_in_minutes = var.deployment_ready_action == "STOP_DEPLOYMENT" ? var.deployment_ready_wait_time : null
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = var.frontend_service_name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.frontend_listener_arn]
      }

      dynamic "test_traffic_route" {
        for_each = var.frontend_test_listener_arn != "" ? [1] : []
        content {
          listener_arns = [var.frontend_test_listener_arn]
        }
      }

      target_group {
        name = var.frontend_blue_target_group_name
      }

      target_group {
        name = var.frontend_green_target_group_name
      }
    }
  }

  dynamic "alarm_configuration" {
    for_each = length(var.frontend_cloudwatch_alarms) > 0 ? [1] : []
    content {
      enabled                   = true
      alarms                    = var.frontend_cloudwatch_alarms
      ignore_poll_alarm_failure = var.ignore_poll_alarm_failure
    }
  }

  dynamic "trigger_configuration" {
    for_each = var.enable_deployment_triggers ? [1] : []
    content {
      trigger_name       = "frontend-deployment-trigger"
      trigger_target_arn = aws_sns_topic.deployment_notifications.arn
      trigger_events = [
        "DeploymentStart",
        "DeploymentSuccess",
        "DeploymentFailure",
        "DeploymentStop",
        "DeploymentRollback"
      ]
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-frontend-deployment-group-${var.environment}"
      ServiceType = "Frontend"
    }
  )
}

# ============================================================================
# CodeDeploy Deployment Group - Backend
# ============================================================================

resource "aws_codedeploy_deployment_group" "backend" {
  count = var.enable_backend_deployment ? 1 : 0

  app_name               = aws_codedeploy_app.ecs_app.name
  deployment_group_name  = "backend-${var.environment}"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = var.backend_deployment_config

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  blue_green_deployment_config {
    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = var.blue_termination_wait_time
    }

    deployment_ready_option {
      action_on_timeout    = var.deployment_ready_action
      wait_time_in_minutes = var.deployment_ready_action == "STOP_DEPLOYMENT" ? var.deployment_ready_wait_time : null
    }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  ecs_service {
    cluster_name = var.ecs_cluster_name
    service_name = var.backend_service_name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [var.backend_listener_arn]
      }

      dynamic "test_traffic_route" {
        for_each = var.backend_test_listener_arn != "" ? [1] : []
        content {
          listener_arns = [var.backend_test_listener_arn]
        }
      }

      target_group {
        name = var.backend_blue_target_group_name
      }

      target_group {
        name = var.backend_green_target_group_name
      }
    }
  }

  dynamic "alarm_configuration" {
    for_each = length(var.backend_cloudwatch_alarms) > 0 ? [1] : []
    content {
      enabled                   = true
      alarms                    = var.backend_cloudwatch_alarms
      ignore_poll_alarm_failure = var.ignore_poll_alarm_failure
    }
  }

  dynamic "trigger_configuration" {
    for_each = var.enable_deployment_triggers ? [1] : []
    content {
      trigger_name       = "backend-deployment-trigger"
      trigger_target_arn = aws_sns_topic.deployment_notifications.arn
      trigger_events = [
        "DeploymentStart",
        "DeploymentSuccess",
        "DeploymentFailure",
        "DeploymentStop",
        "DeploymentRollback"
      ]
    }
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-backend-deployment-group-${var.environment}"
      ServiceType = "Backend"
    }
  )
}

# ============================================================================
# CloudWatch Log Group for Deployment Logs
# ============================================================================

resource "aws_cloudwatch_log_group" "deployment_logs" {
  name              = "/aws/codedeploy/${var.project_name}/${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-logs-${var.environment}"
    }
  )
}

# ============================================================================
# S3 Bucket for Deployment Artifacts (Optional)
# ============================================================================

resource "aws_s3_bucket" "deployment_artifacts" {
  count  = var.create_deployment_bucket ? 1 : 0
  bucket = "${var.project_name}-deployment-artifacts-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-deployment-artifacts-${var.environment}"
    }
  )
}

resource "aws_s3_bucket_versioning" "deployment_artifacts" {
  count  = var.create_deployment_bucket ? 1 : 0
  bucket = aws_s3_bucket.deployment_artifacts[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "deployment_artifacts" {
  count  = var.create_deployment_bucket ? 1 : 0
  bucket = aws_s3_bucket.deployment_artifacts[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_id != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_id != "" ? var.kms_key_id : null
    }
  }
}

resource "aws_s3_bucket_public_access_block" "deployment_artifacts" {
  count  = var.create_deployment_bucket ? 1 : 0
  bucket = aws_s3_bucket.deployment_artifacts[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "deployment_artifacts" {
  count  = var.create_deployment_bucket ? 1 : 0
  bucket = aws_s3_bucket.deployment_artifacts[0].id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_caller_identity" "current" {}
