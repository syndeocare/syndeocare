output "address" {
  value = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "database_name" {
  value = aws_db_instance.this.db_name
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "secret_arn" {
  value = aws_secretsmanager_secret.this.arn
}

output "database_url" {
  value     = "postgresql://${var.username}:${random_password.this.result}@${aws_db_instance.this.address}:5432/${var.db_name}"
  sensitive = true
}
