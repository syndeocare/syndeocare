#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?usage: build-and-push-images.sh <dev|staging|prod> [tag]}"
TAG="${2:-$(git rev-parse --short HEAD)}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

RUNTIME_PACKAGE="@repo/platform-api-service"
REPOSITORY="syndeocare/${ENVIRONMENT}/services-runtime"
IMAGE_URI="${REGISTRY}/${REPOSITORY}:${TAG}"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

pnpm --filter "${RUNTIME_PACKAGE}..." build
pnpm --filter @repo/api-gateway... build
pnpm --filter @repo/identity-service... build
pnpm --filter @repo/profiles-service... build
pnpm --filter @repo/clinics-service... build
pnpm --filter @repo/scheduling-service... build
pnpm --filter @repo/notifications-service... build
pnpm --filter @repo/messaging-service... build

aws ecr describe-repositories --repository-names "$REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$REPOSITORY" --region "$AWS_REGION" >/dev/null

if ! aws ecr describe-images --repository-name "$REPOSITORY" --region "$AWS_REGION" --image-ids imageTag="$TAG" >/dev/null 2>&1; then
  docker buildx build \
    --progress plain \
    --platform linux/amd64 \
    --file infra/docker/Dockerfile.service \
    --tag "$IMAGE_URI" \
    --push \
    .
fi

printf '%s=%s\n' "PLATFORM_API_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "API_GATEWAY_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "IDENTITY_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "PROFILES_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "CLINICS_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "SCHEDULING_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "NOTIFICATIONS_IMAGE" "$IMAGE_URI"
printf '%s=%s\n' "MESSAGING_IMAGE" "$IMAGE_URI"
