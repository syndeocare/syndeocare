variable "name" {
  type = string
}

variable "cluster_arn" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type    = string
  default = null
}

variable "listener_arn" {
  type    = string
  default = null
}

variable "listener_rule_priority" {
  type    = number
  default = null
}

variable "listener_path_patterns" {
  type    = list(string)
  default = []
}

variable "service_discovery_namespace_id" {
  type    = string
  default = null
}

variable "service_discovery_namespace_name" {
  type    = string
  default = null
}

variable "discovery_name" {
  type = string
}

variable "image" {
  type = string
}

variable "container_name" {
  type    = string
  default = "app"
}

variable "container_port" {
  type = number
}

variable "cpu" {
  type    = number
  default = 512
}

variable "memory" {
  type    = number
  default = 1024
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "enable_execute_command" {
  type    = bool
  default = true
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "allowed_cidr_blocks" {
  type    = list(string)
  default = []
}

variable "environment" {
  type    = map(string)
  default = {}
}

variable "secrets" {
  type    = map(string)
  default = {}
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "tags" {
  type    = map(string)
  default = {}
}
