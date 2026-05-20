module "vpc" {
  source = "../../modules/vpc"
  name   = "syndeocare-staging"
}

module "postgres" {
  source = "../../modules/postgres"
  name   = "syndeocare-staging"
}

module "event_backbone" {
  source = "../../modules/event-backbone"
  name   = "syndeocare-staging"
}

module "ecs_service" {
  source = "../../modules/ecs-service"
  name   = "syndeocare-staging"
}
