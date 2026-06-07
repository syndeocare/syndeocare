variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "allowed_cidr_blocks" {
  type = list(string)
}

variable "service_discovery_namespace_name" {
  type    = string
  default = "syndeocare.internal"
}

variable "nats_image" {
  type    = string
  default = "nats:2.10-alpine"
}

variable "nats_cpu" {
  type    = number
  default = 512
}

variable "nats_memory" {
  type    = number
  default = 1024
}

variable "nats_desired_count" {
  type    = number
  default = 1
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "tags" {
  type    = map(string)
  default = {}
}
