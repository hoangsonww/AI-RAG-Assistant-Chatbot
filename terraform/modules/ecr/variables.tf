variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "enforce_immutable_tags" {
  description = "Enforce image tag immutability"
  type        = bool
  default     = true
}
