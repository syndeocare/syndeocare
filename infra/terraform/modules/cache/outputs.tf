output "primary_endpoint_address" {
  value = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint_address" {
  value = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  value = aws_elasticache_replication_group.this.port
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "secret_arn" {
  value = aws_secretsmanager_secret.this.arn
}

output "redis_url" {
  value     = "rediss://:${random_password.this.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  sensitive = true
}
