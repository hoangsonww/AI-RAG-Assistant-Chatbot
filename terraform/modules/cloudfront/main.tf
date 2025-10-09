locals {
  effective_log_bucket_name = var.log_bucket_name != "" ? var.log_bucket_name : "${var.environment}-lumina-cloudfront-logs"
  logging_bucket_domain     = "${local.effective_log_bucket_name}.s3.amazonaws.com"
}

resource "aws_s3_bucket" "logs" {
  count = var.enable_logging && var.log_bucket_name == "" ? 1 : 0

  bucket = local.effective_log_bucket_name

  tags = {
    Name = "${var.environment}-lumina-cloudfront-logs"
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  count  = length(aws_s3_bucket.logs)
  bucket = aws_s3_bucket.logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  count  = length(aws_s3_bucket.logs)
  bucket = aws_s3_bucket.logs[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "logs" {
  count     = length(aws_s3_bucket.logs)
  bucket    = aws_s3_bucket.logs[0].id
  acl       = "log-delivery-write"
  depends_on = [aws_s3_bucket_ownership_controls.logs]
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  count  = length(aws_s3_bucket.logs)
  bucket = aws_s3_bucket.logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count  = length(aws_s3_bucket.logs)
  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "logs" {
  count  = length(aws_s3_bucket.logs)
  bucket = aws_s3_bucket.logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSCloudFrontLogDelivery"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.logs[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid       = "AWSCloudFrontLogDeliveryACL"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.logs[0].arn
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  comment             = "Lumina CDN for ${var.environment}"
  default_root_object = ""
  aliases             = [var.domain_name]
  price_class         = var.price_class

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "lumina-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "lumina-alb"

    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf" # CORS-S3Origin
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  dynamic "logging_config" {
    for_each = var.enable_logging ? [1] : []

    content {
      bucket = local.logging_bucket_domain
      prefix = "cloudfront/${var.environment}"
      include_cookies = false
    }
  }

  tags = {
    Name = "${var.environment}-lumina-cloudfront"
  }
}
