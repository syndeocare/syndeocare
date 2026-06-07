output "cluster_arn" {
  value = aws_ecs_cluster.this.arn
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_discovery_namespace_id" {
  value = aws_service_discovery_private_dns_namespace.this.id
}

output "service_discovery_namespace_name" {
  value = aws_service_discovery_private_dns_namespace.this.name
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "nats_security_group_id" {
  value = aws_security_group.nats.id
}

output "nats_url" {
  value = "nats://nats.${aws_service_discovery_private_dns_namespace.this.name}:4222"
}

output "nats_monitoring_url" {
  value = "http://nats.${aws_service_discovery_private_dns_namespace.this.name}:8222"
}

output "nats_nlb_dns_name" {
  value = aws_lb.nats.dns_name
}
