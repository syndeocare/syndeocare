module "vpc" {
  source = "../../modules/vpc"
  name   = "syndeocare-prod"
}

module "postgres" {
  source = "../../modules/postgres"
  name   = "syndeocare-prod"
}

module "event_backbone" {
  source = "../../modules/event-backbone"
  name   = "syndeocare-prod"
}

module "ecs_service" {
  source = "../../modules/ecs-service"
  name   = "syndeocare-prod"
}
