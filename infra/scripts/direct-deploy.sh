#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?usage: direct-deploy.sh <dev|staging|prod> [tag]}"
TAG="${2:-$(git rev-parse --short HEAD)}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

eval "$(aws configure export-credentials --format env)"

cd "$ROOT_DIR"

default_public_bucket="syndeocare-${ENVIRONMENT}-public-assets"
default_private_bucket="syndeocare-${ENVIRONMENT}-private-documents"
resolved_public_bucket="${STORAGE_PUBLIC_BUCKET:-$default_public_bucket}"
resolved_private_bucket="${STORAGE_PRIVATE_BUCKET:-$default_private_bucket}"

create_bucket_if_missing() {
  local bucket="$1"
  if ! aws s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
    aws s3api create-bucket --bucket "$bucket" --region "$AWS_REGION" >/dev/null
  fi
}

create_bucket_if_missing "$resolved_public_bucket"
create_bucket_if_missing "$resolved_private_bucket"

aws s3api put-public-access-block \
  --bucket "$resolved_public_bucket" \
  --public-access-block-configuration '{
    "BlockPublicAcls": false,
    "IgnorePublicAcls": false,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
  }' >/dev/null

aws s3api put-bucket-policy \
  --bucket "$resolved_public_bucket" \
  --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"AllowPublicReadObjects\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::${resolved_public_bucket}/*\"]}]}" >/dev/null

cors_configuration_json="$(mktemp)"
cat >"$cors_configuration_json" <<EOF
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket "$resolved_public_bucket" --cors-configuration "file://${cors_configuration_json}" >/dev/null
aws s3api put-bucket-cors --bucket "$resolved_private_bucket" --cors-configuration "file://${cors_configuration_json}" >/dev/null
rm -f "$cors_configuration_json"

PLATFORM_API_IMAGE=""
API_GATEWAY_IMAGE=""
IDENTITY_IMAGE=""
PROFILES_IMAGE=""
CLINICS_IMAGE=""
SCHEDULING_IMAGE=""
NOTIFICATIONS_IMAGE=""

BUILD_OUTPUT="$("${SCRIPT_DIR}/build-and-push-images.sh" "$ENVIRONMENT" "$TAG")"

while IFS='=' read -r key value; do
  case "$key" in
    PLATFORM_API_IMAGE) PLATFORM_API_IMAGE="$value" ;;
    API_GATEWAY_IMAGE) API_GATEWAY_IMAGE="$value" ;;
    IDENTITY_IMAGE) IDENTITY_IMAGE="$value" ;;
    PROFILES_IMAGE) PROFILES_IMAGE="$value" ;;
    CLINICS_IMAGE) CLINICS_IMAGE="$value" ;;
    SCHEDULING_IMAGE) SCHEDULING_IMAGE="$value" ;;
    NOTIFICATIONS_IMAGE) NOTIFICATIONS_IMAGE="$value" ;;
  esac
done <<<"$BUILD_OUTPUT"

if [[ -n "${WEB_FRONTEND_BUCKET:-}" ]]; then
  pnpm build:web
  aws s3 sync apps/web/dist "s3://${WEB_FRONTEND_BUCKET}" --delete
fi

pushd "infra/terraform/environments/${ENVIRONMENT}" >/dev/null
terraform init -input=false -plugin-dir="$HOME/.terraform.d/plugins"
TF_ARGS=(
  -var "aws_region=${AWS_REGION}"
  -var "platform_api_image=${PLATFORM_API_IMAGE}"
  -var "api_gateway_image=${API_GATEWAY_IMAGE}"
  -var "identity_image=${IDENTITY_IMAGE}"
  -var "profiles_image=${PROFILES_IMAGE}"
  -var "clinics_image=${CLINICS_IMAGE}"
  -var "scheduling_image=${SCHEDULING_IMAGE}"
  -var "notifications_image=${NOTIFICATIONS_IMAGE}"
)

append_tf_var() {
  local name="$1"
  local value="${2:-}"
  if [[ -n "$value" ]]; then
    TF_ARGS+=(-var "${name}=${value}")
  fi
}

append_tf_var "api_public_base_url" "${API_PUBLIC_BASE_URL:-}"
append_tf_var "keycloak_base_url" "${KEYCLOAK_BASE_URL:-}"
append_tf_var "keycloak_admin_username" "${KEYCLOAK_ADMIN_USERNAME:-}"
append_tf_var "keycloak_admin_password" "${KEYCLOAK_ADMIN_PASSWORD:-}"
append_tf_var "keycloak_admin_realm" "${KEYCLOAK_ADMIN_REALM:-}"
append_tf_var "keycloak_public_client_id" "${KEYCLOAK_PUBLIC_CLIENT_ID:-}"
append_tf_var "auth_api_client_id" "${AUTH_API_CLIENT_ID:-}"
append_tf_var "auth_realm" "${AUTH_REALM:-}"
append_tf_var "google_oauth_client_id" "${GOOGLE_OAUTH_CLIENT_ID:-}"
append_tf_var "google_oauth_client_secret" "${GOOGLE_OAUTH_CLIENT_SECRET:-}"
append_tf_var "email_from_address" "${EMAIL_FROM_ADDRESS:-SyndeoCare <no-reply@syndeocare.ai>}"
append_tf_var "storage_public_bucket" "${STORAGE_PUBLIC_BUCKET:-}"
append_tf_var "storage_private_bucket" "${STORAGE_PRIVATE_BUCKET:-}"
append_tf_var "storage_public_base_url" "${STORAGE_PUBLIC_BASE_URL:-}"
append_tf_var "route53_zone_name" "${ROUTE53_ZONE_NAME:-}"
append_tf_var "api_domain_name" "${API_DOMAIN_NAME:-}"

terraform apply -auto-approve "${TF_ARGS[@]}"
popd >/dev/null
