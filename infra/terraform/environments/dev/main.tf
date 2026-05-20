module "vpc" {
  source = "../../modules/vpc"
  name   = "syndeocare-dev"
}

module "postgres" {
  source = "../../modules/postgres"
  name   = "syndeocare-dev"
}

module "event_backbone" {
  source = "../../modules/event-backbone"
  name   = "syndeocare-dev"
}

module "ecs_service" {
  source = "../../modules/ecs-service"
  name   = "syndeocare-dev"
}
