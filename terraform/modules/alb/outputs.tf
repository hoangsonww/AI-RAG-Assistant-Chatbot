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

output "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  value       = aws_lb_target_group.frontend.arn
}

output "backend_target_group_arn" {
  description = "ARN of the backend target group"
  value       = aws_lb_target_group.backend.arn
}

output "security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}
