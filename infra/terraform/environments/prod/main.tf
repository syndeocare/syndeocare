terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "syndeocare-prod-terraform-state-433956820920"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "syndeocare-prod-terraform-locks"
    encrypt        = true
  }

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
  default = "https://api.syndeocare.example.com"
}

variable "web_public_url" {
  type    = string
  default = "https://syndeocare.ai"
}

variable "platform_api_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "api_gateway_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "identity_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "profiles_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "clinics_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "scheduling_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "notifications_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "messaging_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:stable-alpine"
}

variable "keycloak_base_url" {
  type    = string
  default = "https://auth.syndeocare.example.com"
}

variable "keycloak_admin_username" {
  type    = string
  default = "admin"
}

variable "keycloak_admin_password" {
  type      = string
  sensitive = true
  default   = "ChangeMe123!"
}

variable "keycloak_admin_realm" {
  type    = string
  default = "master"
}

variable "keycloak_public_client_id" {
  type    = string
  default = "syndeocare-web"
}

variable "auth_api_client_id" {
  type    = string
  default = "syndeocare-api"
}

variable "auth_realm" {
  type    = string
  default = "syndeocare"
}

variable "google_oauth_client_id" {
  type    = string
  default = ""
}

variable "google_oauth_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "resend_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "resend_from_email" {
  type    = string
  default = "onboarding@resend.dev"
}

variable "resend_test_email" {
  type    = string
  default = "onboarding@resend.dev"
}

variable "storage_access_key_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "storage_secret_access_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "storage_region" {
  type    = string
  default = "us-east-1"
}

variable "storage_public_bucket" {
  type    = string
  default = "syndeocare-prod-public-assets"
}

variable "storage_private_bucket" {
  type    = string
  default = "syndeocare-prod-private-documents"
}

variable "storage_public_base_url" {
  type    = string
  default = ""
}

variable "route53_zone_name" {
  type    = string
  default = ""
}

variable "api_domain_name" {
  type    = string
  default = ""
}

provider "aws" {
  region            = var.aws_region
  s3_use_path_style = true
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  environment    = "prod"
  name           = "syndeocare-prod"
  vpc_cidr_block = "10.30.0.0/16"
  tls_enabled    = var.route53_zone_name != "" && var.api_domain_name != ""
  public_base_url = var.api_public_base_url != "" ? var.api_public_base_url : (
    local.tls_enabled ? "https://${var.api_domain_name}" : "http://${aws_lb.public.dns_name}"
  )
  tags = {
    Project     = "syndeocare"
    Environment = local.environment
    ManagedBy   = "terraform"
  }
}

resource "random_password" "internal_service_token" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "runtime" {
  name                    = "${local.name}/runtime"
  recovery_window_in_days = 7

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "runtime" {
  secret_id = aws_secretsmanager_secret.runtime.id
  secret_string = jsonencode({
    internal_service_token     = random_password.internal_service_token.result
    keycloak_admin_password    = var.keycloak_admin_password
    google_oauth_client_secret = var.google_oauth_client_secret
    resend_api_key             = var.resend_api_key
    storage_access_key_id      = var.storage_access_key_id
    storage_secret_access_key  = var.storage_secret_access_key
  })
}

module "vpc" {
  source                = "../../modules/vpc"
  name                  = local.name
  cidr_block            = local.vpc_cidr_block
  availability_zones    = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs   = ["10.30.0.0/24", "10.30.1.0/24"]
  private_subnet_cidrs  = ["10.30.10.0/24", "10.30.11.0/24"]
  database_subnet_cidrs = ["10.30.20.0/24", "10.30.21.0/24"]
  tags                  = local.tags
}

resource "aws_lb" "public" {
  name               = "syndeocare-prod-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.vpc.alb_security_group_id]
  subnets            = module.vpc.public_subnet_ids

  tags = local.tags
}

data "aws_route53_zone" "api" {
  count        = local.tls_enabled ? 1 : 0
  name         = var.route53_zone_name
  private_zone = false
}

resource "aws_acm_certificate" "api" {
  count             = local.tls_enabled ? 1 : 0
  domain_name       = var.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "api_validation" {
  for_each = local.tls_enabled ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id         = data.aws_route53_zone.api[0].zone_id
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "api" {
  count = local.tls_enabled ? 1 : 0

  certificate_arn         = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for record in aws_route53_record.api_validation : record.fqdn]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = local.tls_enabled ? [1] : []

    content {
      type = "redirect"

      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = local.tls_enabled ? [] : [1]

    content {
      type = "fixed-response"

      fixed_response {
        content_type = "application/json"
        message_body = jsonencode({ message = "No matching SyndeoCare route configured." })
        status_code  = "404"
      }
    }
  }
}

resource "aws_lb_listener" "https" {
  count = local.tls_enabled ? 1 : 0

  load_balancer_arn = aws_lb.public.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api[0].certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "application/json"
      message_body = jsonencode({ message = "No matching SyndeoCare route configured." })
      status_code  = "404"
    }
  }
}

resource "aws_route53_record" "api_alias" {
  count = local.tls_enabled ? 1 : 0

  zone_id         = data.aws_route53_zone.api[0].zone_id
  name            = var.api_domain_name
  type            = "A"
  allow_overwrite = true

  alias {
    evaluate_target_health = true
    name                   = aws_lb.public.dns_name
    zone_id                = aws_lb.public.zone_id
  }
}

module "event_backbone" {
  source                           = "../../modules/event-backbone"
  name                             = local.name
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  service_discovery_namespace_name = "prod.syndeocare.internal"
  nats_cpu                         = 1024
  nats_memory                      = 2048
  nats_desired_count               = 1
  tags                             = local.tags
}

module "postgres" {
  source                  = "../../modules/postgres"
  name                    = local.name
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnet_ids
  allowed_cidr_blocks     = [module.vpc.vpc_cidr_block]
  db_name                 = "syndeocare"
  username                = "syndeocare"
  instance_class          = "db.t4g.small"
  allocated_storage       = 80
  max_allocated_storage   = 300
  backup_retention_period = 14
  deletion_protection     = true
  skip_final_snapshot     = false
  multi_az                = true
  tags                    = local.tags
}

module "cache" {
  source              = "../../modules/cache"
  name                = local.name
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  allowed_cidr_blocks = [module.vpc.vpc_cidr_block]
  node_type           = "cache.t4g.small"
  num_cache_clusters  = 2
  tags                = local.tags
}

module "object_storage" {
  source               = "../../modules/object-storage"
  public_bucket_name   = var.storage_public_bucket
  private_bucket_name  = var.storage_private_bucket
  cors_allowed_origins = distinct(compact([local.public_base_url, var.web_public_url]))
  tags                 = local.tags
}

module "notifications_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-notifications"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "notifications"
  image                            = var.notifications_image
  container_name                   = "notifications"
  container_port                   = 4115
  desired_count                    = 2
  health_check_path                = "/health"
  environment = {
    NODE_ENV          = "production"
    PORT              = "4115"
    SERVICE_DIR       = "services/notifications"
    RESEND_FROM_EMAIL = var.resend_from_email
    RESEND_TEST_EMAIL = var.resend_test_email
  }
  secrets = {
    DATABASE_URL           = "${module.postgres.secret_arn}:url::"
    INTERNAL_SERVICE_TOKEN = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
    RESEND_API_KEY         = "${aws_secretsmanager_secret.runtime.arn}:resend_api_key::"
  }
  tags = local.tags
}

module "messaging_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-messaging"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "messaging"
  image                            = var.messaging_image
  container_name                   = "messaging"
  container_port                   = 4116
  desired_count                    = 2
  health_check_path                = "/health"
  environment = {
    NODE_ENV    = "production"
    PORT        = "4116"
    SERVICE_DIR = "services/messaging"
    NATS_URL    = module.event_backbone.nats_url
  }
  secrets = {
    DATABASE_URL           = "${module.postgres.secret_arn}:url::"
    INTERNAL_SERVICE_TOKEN = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
  }
  tags = local.tags
}

module "identity_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-identity"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "identity"
  image                            = var.identity_image
  container_name                   = "identity"
  container_port                   = 4111
  desired_count                    = 2
  health_check_path                = "/health"
  environment = {
    NODE_ENV                  = "production"
    PORT                      = "4111"
    SERVICE_DIR               = "services/identity"
    AUTH_CLIENT_ID            = var.auth_api_client_id
    AUTH_REALM                = var.auth_realm
    GOOGLE_OAUTH_CLIENT_ID    = var.google_oauth_client_id
    KEYCLOAK_ADMIN_REALM      = var.keycloak_admin_realm
    KEYCLOAK_ADMIN_USERNAME   = var.keycloak_admin_username
    KEYCLOAK_BASE_URL         = var.keycloak_base_url
    KEYCLOAK_PUBLIC_CLIENT_ID = var.keycloak_public_client_id
    KEYCLOAK_REALM            = var.auth_realm
    NATS_URL                  = module.event_backbone.nats_url
    SERVICE_NOTIFICATIONS_URL = "http://${module.notifications_service.service_discovery_service_name}:4115"
  }
  secrets = {
    DATABASE_URL               = "${module.postgres.secret_arn}:url::"
    GOOGLE_OAUTH_CLIENT_SECRET = "${aws_secretsmanager_secret.runtime.arn}:google_oauth_client_secret::"
    INTERNAL_SERVICE_TOKEN     = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
    KEYCLOAK_ADMIN_PASSWORD    = "${aws_secretsmanager_secret.runtime.arn}:keycloak_admin_password::"
  }
  tags = local.tags
}

module "profiles_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-profiles"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "profiles"
  image                            = var.profiles_image
  container_name                   = "profiles"
  container_port                   = 4112
  desired_count                    = 2
  health_check_path                = "/health"
  environment = {
    NODE_ENV    = "production"
    PORT        = "4112"
    SERVICE_DIR = "services/profiles"
    NATS_URL    = module.event_backbone.nats_url
  }
  secrets = {
    DATABASE_URL           = "${module.postgres.secret_arn}:url::"
    INTERNAL_SERVICE_TOKEN = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
  }
  tags = local.tags
}

module "clinics_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-clinics"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "clinics"
  image                            = var.clinics_image
  container_name                   = "clinics"
  container_port                   = 4113
  desired_count                    = 2
  health_check_path                = "/health"
  environment = {
    NODE_ENV    = "production"
    PORT        = "4113"
    SERVICE_DIR = "services/clinics"
    NATS_URL    = module.event_backbone.nats_url
  }
  secrets = {
    DATABASE_URL           = "${module.postgres.secret_arn}:url::"
    INTERNAL_SERVICE_TOKEN = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
  }
  tags = local.tags
}

module "scheduling_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-scheduling"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  allowed_cidr_blocks              = [module.vpc.vpc_cidr_block]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "scheduling"
  image                            = var.scheduling_image
  container_name                   = "scheduling"
  container_port                   = 4114
  desired_count                    = 2
  health_check_path                = "/health"
  environment = {
    NODE_ENV    = "production"
    PORT        = "4114"
    SERVICE_DIR = "services/scheduling"
    NATS_URL    = module.event_backbone.nats_url
  }
  secrets = {
    DATABASE_URL           = "${module.postgres.secret_arn}:url::"
    INTERNAL_SERVICE_TOKEN = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
  }
  tags = local.tags
}

module "api_gateway_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-api-gateway"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  alb_security_group_id            = module.vpc.alb_security_group_id
  attach_to_alb                    = true
  listener_arn                     = local.tls_enabled ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
  listener_rule_priority           = 90
  listener_path_patterns           = ["/v1", "/v1/*"]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "api-gateway"
  image                            = var.api_gateway_image
  container_name                   = "api-gateway"
  container_port                   = 4110
  cpu                              = 512
  memory                           = 1024
  desired_count                    = 2
  health_check_path                = "/health"
  attach_task_role_policy          = true
  task_role_policy_json            = module.object_storage.task_access_policy_json
  environment = {
    NODE_ENV                       = "production"
    PORT                           = "4110"
    SERVICE_DIR                    = "services/api-gateway"
    AUTH_AUDIENCE                  = var.auth_api_client_id
    AUTH_CLIENT_ID                 = var.auth_api_client_id
    AUTH_ISSUER_URL                = "${var.keycloak_base_url}/realms/${var.auth_realm}"
    AUTH_MODE                      = "strict"
    AUTH_REALM                     = var.auth_realm
    KEYCLOAK_BASE_URL              = var.keycloak_base_url
    KEYCLOAK_PUBLIC_CLIENT_ID      = var.keycloak_public_client_id
    SERVICE_CLINICS_URL            = "http://${module.clinics_service.service_discovery_service_name}:4113"
    SERVICE_IDENTITY_URL           = "http://${module.identity_service.service_discovery_service_name}:4111"
    SERVICE_MESSAGING_URL          = "http://${module.messaging_service.service_discovery_service_name}:4116"
    SERVICE_NOTIFICATIONS_URL      = "http://${module.notifications_service.service_discovery_service_name}:4115"
    SERVICE_PROFILES_URL           = "http://${module.profiles_service.service_discovery_service_name}:4112"
    SERVICE_SCHEDULING_URL         = "http://${module.scheduling_service.service_discovery_service_name}:4114"
    STORAGE_ENDPOINT               = ""
    STORAGE_FORCE_PATH_STYLE       = "false"
    STORAGE_PRIVATE_BUCKET         = module.object_storage.private_bucket_name
    STORAGE_PUBLIC_BASE_URL        = var.storage_public_base_url
    STORAGE_PUBLIC_BUCKET          = module.object_storage.public_bucket_name
    STORAGE_REGION                 = var.storage_region
    STORAGE_UPLOAD_URL_TTL_SECONDS = "900"
  }
  secrets = {
    INTERNAL_SERVICE_TOKEN = "${aws_secretsmanager_secret.runtime.arn}:internal_service_token::"
  }
  tags = local.tags
}

module "platform_api_service" {
  source                           = "../../modules/ecs-service"
  name                             = "${local.name}-platform-api"
  cluster_arn                      = module.event_backbone.cluster_arn
  vpc_id                           = module.vpc.vpc_id
  private_subnet_ids               = module.vpc.private_subnet_ids
  alb_security_group_id            = module.vpc.alb_security_group_id
  attach_to_alb                    = true
  listener_arn                     = local.tls_enabled ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
  listener_rule_priority           = 100
  listener_path_patterns           = ["/platform-api/*"]
  enable_service_discovery         = true
  service_discovery_namespace_id   = module.event_backbone.service_discovery_namespace_id
  service_discovery_namespace_name = module.event_backbone.service_discovery_namespace_name
  discovery_name                   = "platform-api"
  image                            = var.platform_api_image
  container_name                   = "platform-api"
  container_port                   = 4300
  cpu                              = 1024
  memory                           = 2048
  desired_count                    = 2
  health_check_path                = "/platform-api/v1/health/live"
  environment = {
    NODE_ENV              = "production"
    HOST                  = "0.0.0.0"
    PORT                  = "4300"
    SERVICE_DIR           = "services/platform-api"
    API_DOCS_PATH         = "docs"
    API_PUBLIC_URL        = "${local.public_base_url}/platform-api/v1"
    API_CORS_ORIGINS      = local.public_base_url
    CACHE_TTL_SECONDS     = "60"
    NATS_URL              = module.event_backbone.nats_url
    REQUEST_TIMEOUT_MS    = "5000"
    HTTP_RETRY_ATTEMPTS   = "3"
    HTTP_RETRY_BACKOFF_MS = "250"
  }
  secrets = {
    DATABASE_URL = "${module.postgres.secret_arn}:url::"
    REDIS_URL    = "${module.cache.secret_arn}:redis_url::"
  }
  tags = local.tags
}

output "platform_api_url" {
  value = "${local.public_base_url}/platform-api/v1"
}

output "api_gateway_url" {
  value = "${local.public_base_url}/v1"
}
