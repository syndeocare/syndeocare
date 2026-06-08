locals {
  common_tags = merge(
    {
      Name = var.name
    },
    var.tags,
  )

  database_url = "postgresql://${urlencode(var.username)}:${urlencode(random_password.this.result)}@${aws_db_instance.this.address}:5432/${var.db_name}"
}

resource "aws_security_group" "this" {
  name        = "${var.name}-postgres"
  description = "PostgreSQL access for ${var.name}"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-postgres-sg"
  })
}

resource "aws_security_group_rule" "ingress" {
  for_each = toset(var.allowed_cidr_blocks)

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.this.id
  description       = "Allow PostgreSQL from ${each.value}"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-postgres"
  subnet_ids = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.name}-postgres-subnets"
  })
}

resource "random_password" "this" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "this" {
  name                    = "${var.name}/postgres"
  recovery_window_in_days = 7

  tags = merge(local.common_tags, {
    Name = "${var.name}-postgres-secret"
  })
}

resource "aws_db_instance" "this" {
  identifier                  = "${var.name}-postgres"
  engine                      = "postgres"
  engine_version              = var.engine_version
  instance_class              = var.instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  db_name                     = var.db_name
  username                    = var.username
  password                    = random_password.this.result
  port                        = 5432
  db_subnet_group_name        = aws_db_subnet_group.this.name
  vpc_security_group_ids      = [aws_security_group.this.id]
  backup_retention_period     = var.backup_retention_period
  deletion_protection         = var.deletion_protection
  skip_final_snapshot         = var.skip_final_snapshot
  multi_az                    = var.multi_az
  publicly_accessible         = false
  storage_encrypted           = true
  auto_minor_version_upgrade  = true
  apply_immediately           = true
  performance_insights_enabled = true

  tags = merge(local.common_tags, {
    Name = "${var.name}-postgres"
  })
}

resource "aws_secretsmanager_secret_version" "this" {
  secret_id = aws_secretsmanager_secret.this.id
  secret_string = jsonencode({
    username     = var.username
    password     = random_password.this.result
    host         = aws_db_instance.this.address
    port         = 5432
    database     = var.db_name
    database_url = local.database_url
    url          = local.database_url
  })
}
