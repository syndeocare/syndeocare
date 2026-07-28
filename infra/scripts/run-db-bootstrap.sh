#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?usage: run-db-bootstrap.sh <dev|staging|prod>}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="syndeocare-${ENVIRONMENT}-cluster"
SERVICE_NAME="syndeocare-${ENVIRONMENT}-profiles"
SEED_MODE="${2:-${RUN_DB_SEED:-false}}"
BOOTSTRAP_COMMAND="cd /app && node packages/persistence/dist/scripts/migrate.js"

if [[ "$SEED_MODE" == "--seed" || "$SEED_MODE" == "true" ]]; then
  if [[ "$ENVIRONMENT" == "prod" || "$ENVIRONMENT" == "production" ]]; then
    echo "Refusing to seed the production database." >&2
    exit 1
  fi

  BOOTSTRAP_COMMAND+=" && node packages/persistence/dist/scripts/seed.js"
fi

task_definition="$(
  aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" \
    --query 'services[0].taskDefinition' \
    --output text
)"

if [[ -z "$task_definition" || "$task_definition" == "None" ]]; then
  echo "Unable to resolve task definition for ${SERVICE_NAME} in ${CLUSTER_NAME}." >&2
  exit 1
fi

subnets="$(
  aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" \
    --query 'services[0].networkConfiguration.awsvpcConfiguration.subnets' \
    --output text | tr '\t' ','
)"

security_groups="$(
  aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" \
    --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups' \
    --output text | tr '\t' ','
)"

assign_public_ip="$(
  aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" \
    --query 'services[0].networkConfiguration.awsvpcConfiguration.assignPublicIp' \
    --output text
)"

container_name="$(
  aws ecs describe-task-definition \
    --task-definition "$task_definition" \
    --region "$AWS_REGION" \
    --query 'taskDefinition.containerDefinitions[0].name' \
    --output text
)"

log_group="$(
  aws ecs describe-task-definition \
    --task-definition "$task_definition" \
    --region "$AWS_REGION" \
    --query 'taskDefinition.containerDefinitions[0].logConfiguration.options."awslogs-group"' \
    --output text
)"

overrides="$(printf '{"containerOverrides":[{"name":"%s","command":["sh","-lc","%s"]}]}' "$container_name" "$BOOTSTRAP_COMMAND")"

task_arn="$(
  aws ecs run-task \
    --cluster "$CLUSTER_NAME" \
    --launch-type FARGATE \
    --task-definition "$task_definition" \
    --region "$AWS_REGION" \
    --network-configuration "awsvpcConfiguration={subnets=[${subnets}],securityGroups=[${security_groups}],assignPublicIp=${assign_public_ip}}" \
    --overrides "$overrides" \
    --query 'tasks[0].taskArn' \
    --output text
)"

if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
  echo "Failed to launch bootstrap task." >&2
  exit 1
fi

task_id="${task_arn##*/}"
log_stream="ecs/${container_name}/${task_id}"

echo "Launched database migration task ${task_id} on ${CLUSTER_NAME}."

aws ecs wait tasks-stopped \
  --cluster "$CLUSTER_NAME" \
  --tasks "$task_arn" \
  --region "$AWS_REGION"

exit_code="$(
  aws ecs describe-tasks \
    --cluster "$CLUSTER_NAME" \
    --tasks "$task_arn" \
    --region "$AWS_REGION" \
    --query 'tasks[0].containers[0].exitCode' \
    --output text
)"

if [[ -n "$log_group" && "$log_group" != "None" ]]; then
  echo "--- bootstrap logs ---"
  aws logs get-log-events \
    --log-group-name "$log_group" \
    --log-stream-name "$log_stream" \
    --region "$AWS_REGION" \
    --query 'events[].message' \
    --output text | tr '\t' '\n' || true
fi

if [[ "$exit_code" != "0" ]]; then
  echo "Database bootstrap task failed with exit code ${exit_code}." >&2
  exit 1
fi

echo "Database migrations completed successfully."
