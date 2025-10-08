variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN in us-east-1"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name to associate with the distribution"
  type        = string
}

variable "enable_logging" {
  description = "Enable CloudFront access logging"
  type        = bool
  default     = true
}

variable "log_bucket_name" {
  description = "Name of the S3 bucket for CloudFront logs (created if not provided)"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}
