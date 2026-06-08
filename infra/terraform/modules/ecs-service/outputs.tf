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
  value = var.attach_to_alb ? aws_lb_target_group.this[0].arn : null
}

output "service_discovery_service_name" {
  value = var.enable_service_discovery ? "${var.discovery_name}.${var.service_discovery_namespace_name}" : null
}
