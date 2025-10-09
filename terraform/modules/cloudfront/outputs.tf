output "distribution_id" {
  description = "Identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.id
}

output "domain_name" {
  description = "Domain name assigned by CloudFront"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "hosted_zone_id" {
  description = "Hosted zone ID for the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.hosted_zone_id
}
