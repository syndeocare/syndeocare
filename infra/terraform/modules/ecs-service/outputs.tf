output "service_name" {
  value = aws_ecs_service.this.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.this.arn
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "target_group_arn" {
  value = var.listener_arn == null ? null : aws_lb_target_group.this[0].arn
}

output "service_discovery_service_name" {
  value = var.service_discovery_namespace_name == null ? null : "${var.discovery_name}.${var.service_discovery_namespace_name}"
}
