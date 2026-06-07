locals {
  common_tags = merge(
    {
      Name = var.name
    },
    var.tags,
  )
}

resource "aws_security_group" "this" {
  name        = "${var.name}-redis"
  description = "Redis access for ${var.name}"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-redis-sg"
  })
}

resource "aws_security_group_rule" "ingress" {
  for_each = toset(var.allowed_cidr_blocks)

  type              = "ingress"
  from_port         = 6379
  to_port           = 6379
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.this.id
  description       = "Allow Redis from ${each.value}"
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-redis"
  subnet_ids = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.name}-redis-subnets"
  })
}

resource "random_password" "this" {
  length           = 32
  special          = false
  numeric          = true
  upper            = true
  lower            = true
}

resource "aws_secretsmanager_secret" "this" {
  name                    = "${var.name}/redis"
  recovery_window_in_days = 7

  tags = merge(local.common_tags, {
    Name = "${var.name}-redis-secret"
  })
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = replace("${var.name}-redis", "_", "-")
  description                = "Redis cache for ${var.name}"
  engine                     = "redis"
  engine_version             = var.engine_version
  node_type                  = var.node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.this.id]
  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1
  multi_az_enabled           = var.num_cache_clusters > 1
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.this.result
  apply_immediately          = true

  tags = merge(local.common_tags, {
    Name = "${var.name}-redis"
  })
}

resource "aws_secretsmanager_secret_version" "this" {
  secret_id = aws_secretsmanager_secret.this.id
  secret_string = jsonencode({
    auth_token = random_password.this.result
    host       = aws_elasticache_replication_group.this.primary_endpoint_address
    port       = 6379
    redis_url  = "rediss://:${random_password.this.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  })
}
