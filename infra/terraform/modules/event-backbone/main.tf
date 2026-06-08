locals {
  common_tags = merge(
    {
      Name = var.name
    },
    var.tags,
  )
}

data "aws_region" "current" {}

resource "aws_ecs_cluster" "this" {
  name = "${var.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-cluster"
  })
}

resource "aws_service_discovery_private_dns_namespace" "this" {
  name        = var.service_discovery_namespace_name
  description = "Private service discovery namespace for ${var.name}"
  vpc         = var.vpc_id

  tags = merge(local.common_tags, {
    Name = "${var.name}-namespace"
  })
}

resource "aws_cloudwatch_log_group" "nats" {
  name              = "/syndeocare/${var.name}/nats"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_security_group" "nats" {
  name        = "${var.name}-nats"
  description = "NATS access for ${var.name}"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-nats-sg"
  })
}

resource "aws_security_group_rule" "nats_client" {
  for_each = toset(var.allowed_cidr_blocks)

  type              = "ingress"
  from_port         = 4222
  to_port           = 4222
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.nats.id
  description       = "Allow NATS clients from ${each.value}"
}

resource "aws_security_group_rule" "nats_monitoring" {
  for_each = toset(var.allowed_cidr_blocks)

  type              = "ingress"
  from_port         = 8222
  to_port           = 8222
  protocol          = "tcp"
  cidr_blocks       = [each.value]
  security_group_id = aws_security_group.nats.id
  description       = "Allow NATS monitoring from ${each.value}"
}

resource "aws_security_group" "efs" {
  name        = "${var.name}-nats-efs"
  description = "EFS mount access for ${var.name} NATS JetStream storage"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.nats.id]
    description     = "Allow NATS JetStream mounts"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-nats-efs-sg"
  })
}

resource "aws_efs_file_system" "this" {
  creation_token = "${var.name}-nats"
  encrypted      = true

  tags = merge(local.common_tags, {
    Name = "${var.name}-nats-efs"
  })
}

resource "aws_efs_access_point" "this" {
  file_system_id = aws_efs_file_system.this.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/jetstream"

    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "0755"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.name}-nats-efs-access-point"
  })
}

resource "aws_efs_mount_target" "this" {
  for_each = {
    for index, subnet_id in var.private_subnet_ids :
    tostring(index) => subnet_id
  }

  file_system_id  = aws_efs_file_system.this.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

resource "aws_iam_role" "task_execution" {
  name = "${var.name}-nats-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name = "${var.name}-nats-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
    ]
  })

  tags = local.common_tags
}

resource "aws_service_discovery_service" "nats" {
  name = "nats"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_lb" "nats" {
  name               = substr(replace("${var.name}-nats", "_", "-"), 0, 32)
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.name}-nats-nlb"
  })
}

resource "aws_lb_target_group" "nats" {
  name        = substr(replace("${var.name}-nats", "_", "-"), 0, 32)
  port        = 4222
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    protocol = "TCP"
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "nats" {
  load_balancer_arn = aws_lb.nats.arn
  port              = 4222
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nats.arn
  }
}

resource "aws_ecs_task_definition" "nats" {
  family                   = "${var.name}-nats"
  cpu                      = tostring(var.nats_cpu)
  memory                   = tostring(var.nats_memory)
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "jetstream-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.this.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.this.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "nats"
      image     = var.nats_image
      essential = true
      command   = ["--jetstream", "--http_port=8222", "--store_dir=/data"]
      portMappings = [
        {
          containerPort = 4222
          hostPort      = 4222
          protocol      = "tcp"
        },
        {
          containerPort = 8222
          hostPort      = 8222
          protocol      = "tcp"
        },
      ]
      mountPoints = [
        {
          sourceVolume  = "jetstream-data"
          containerPath = "/data"
          readOnly      = false
        },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.nats.name
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
        }
      }
    },
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "nats" {
  name                               = "${var.name}-nats"
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.nats.arn
  desired_count                      = var.nats_desired_count
  launch_type                        = "FARGATE"
  enable_execute_command             = true
  health_check_grace_period_seconds  = 30
  wait_for_steady_state              = false

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.nats.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.nats.arn
    container_name   = "nats"
    container_port   = 4222
  }

  service_registries {
    registry_arn = aws_service_discovery_service.nats.arn
  }

  depends_on = [
    aws_lb_listener.nats,
    aws_efs_mount_target.this,
  ]

  tags = local.common_tags
}
