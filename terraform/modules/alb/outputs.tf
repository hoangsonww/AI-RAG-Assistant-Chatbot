output "dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "arn_suffix" {
  description = "ALB ARN suffix"
  value       = aws_lb.main.arn_suffix
}

output "target_group_arn" {
  description = "Target group ARN"
  value       = aws_lb_target_group.main.arn
}

output "security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}
