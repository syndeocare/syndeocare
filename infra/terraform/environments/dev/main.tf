terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.55"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "api_public_base_url" {
  type    = string
  default = "https://api.dev.syndeocare.example.com"
}

variable "platform_api_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  environment         = "dev"
  name                = "syndeocare-dev"
  vpc_cidr_block      = "10.10.0.0/16"
  tags = {
    Project     = "syndeocare"
    Environment = local.environment
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source                = "../../modules/vpc"
  name                  = local.name
  cidr_block            = local.vpc_cidr_block
  availability_zones    = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs   = ["10.10.0.0/24", "10.10.1.0/24"]
  private_subnet_cidrs  = ["10.10.10.0/24", "10.10.11.0/24"]
  database_subnet_cidrs = ["10.10.20.0/24", "10.10.21.0/24"]
  tags                  = local.tags
}

resource "aws_lb" "public" {
  name               = "syndeocare-dev-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.vpc.alb_security_group_id]
  subnets            = module.vpc.public_subnet_ids

  tags = local.tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "application/json"
      message_body = jsonencode({
        message = "No matching SyndeoCare route configured."
      })
      status_code = "404"
    }
  }
}

module "event_backbone" {
  source                         = "../../modules/event-backbone"
  name                           = local.name
  vpc_id                         = module.vpc.vpc_id
  private_subnet_ids             = module.vpc.private_subnet_ids
  allowed_cidr_blocks            = [module.vpc.vpc_cidr_block]
  service_discovery_namespace_name = "dev.syndeocare.internal"
  nats_cpu                       = 512
  nats_memory                    = 1024
  nats_desired_count             = 1
  tags                           = local.tags
}

module "postgres" {
  source                 = "../../modules/postgres"
  name                   = local.name
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.database_subnet_ids
  allowed_cidr_blocks    = [module.vpc.vpc_cidr_block]
  db_name                = "syndeocare"
  username               = "syndeocare"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  max_allocated_storage  = 100
  backup_retention_period = 7
  deletion_protection    = false
  skip_final_snapshot    = true
  multi_az               = false
  tags                   = local.tags
}

module "cache" {
  source              = "../../modules/cache"
  name                = local.name
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  allowed_cidr_blocks = [module.vpc.vpc_cidr_block]
  node_type           = "cache.t4g.micro"
  num_cache_clusters  = 1
  tags                = local.tags
}

module "platform_api_service" {
  source                         = "../../modules/ecs-service"
  name                           = "${local.name}-platform-api"
  cluster_arn                    = module.event_backbone.cluster_arn
  vpc_id                         = module.vpc.vpc_id
  private_subnet_ids             = module.vpc.private_subnet_ids
  alb_security_group_id          = module.vpc.alb_security_group_id
  listener_arn                   = aws_lb_listener.http.arn
  listener_rule_priority         = 100
  listener_path_patterns         = ["/platform-api/*"]
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                 = "platform-api"
  image                          = var.platform_api_image
  container_name                 = "platform-api"
  container_port                 = 4300
  cpu                            = 512
  memory                         = 1024
  desired_count                  = 1
  health_check_path              = "/v1/health/live"
  environment = {
    HOST                   = "0.0.0.0"
    PORT                   = "4300"
    API_DOCS_PATH          = "docs"
    API_PUBLIC_URL         = "${var.api_public_base_url}/platform-api/v1"
    API_CORS_ORIGINS       = var.api_public_base_url
    CACHE_TTL_SECONDS      = "60"
    NATS_URL               = module.event_backbone.nats_url
    REQUEST_TIMEOUT_MS     = "5000"
    HTTP_RETRY_ATTEMPTS    = "3"
    HTTP_RETRY_BACKOFF_MS  = "250"
  }
  secrets = {
    DATABASE_URL = "${module.postgres.secret_arn}:url::"
    REDIS_URL    = "${module.cache.secret_arn}:redis_url::"
  }
  tags = local.tags
}

output "platform_api_url" {
  value = "http://${aws_lb.public.dns_name}/platform-api/v1"
}

output "platform_api_docs_url" {
  value = "http://${aws_lb.public.dns_name}/platform-api/v1/docs"
}

output "nats_url" {
  value = module.event_backbone.nats_url
}
