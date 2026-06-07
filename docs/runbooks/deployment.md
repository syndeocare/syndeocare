# Deployment runbook

## Environments

- `dev`
- `staging`
- `prod`

## Principles

- use GitHub Actions with AWS OIDC
- never store long-lived AWS keys in GitHub secrets
- treat Terraform as the source of truth for infrastructure
- require reviewed promotion into higher environments
- preserve client-facing API compatibility during backend changes
- keep deployment decisions aligned with the product surface split across admin, clinics, and professionals
- host the web frontend separately from the domain services so frontend release cadence does not block core backend rollout

## Baseline flow

1. merge to `main`
2. CI validates repo
3. release workflow versions packages
4. deployment workflow builds images and pushes to ECR
5. Terraform apply and ECS rollout happen through approved environment jobs
6. static frontend assets deploy independently through CloudFront/S3 (preferred) rather than a dedicated EC2 instance

## Terraform module layout

The AWS foundation now lives in reusable modules under `infra/terraform/modules/`:

- `vpc` for public/private/database subnet topology and the public ALB security group
- `postgres` for encrypted RDS PostgreSQL, subnet groups, and Secrets Manager wiring
- `cache` for encrypted ElastiCache Redis and Redis connection secret wiring
- `event-backbone` for the shared ECS cluster, private DNS namespace, and NATS JetStream service
- `ecs-service` for reusable Fargate services that can be either ALB-routed public edges or private service-discovery-only internal services

Each environment in `infra/terraform/environments/{dev,staging,prod}` now composes
those modules into a concrete platform shape.

## Product-aware deployment notes

- admin web releases should not block professional mobile flows
- verification and trust workflows must remain available during service rollout
- booking, messaging, and notifications should be treated as critical business paths
- prefer **S3 + CloudFront** for the public web frontend; reserve EC2 for workloads that truly need long-running servers
- run backend services and NATS on the private platform network boundary, not on the same host as the static frontend
- expose the public API through a dedicated URL path or host so mobile and partner integrations do not depend on the legacy app origin

## Frontend deployment path

The `apps/web` frontend is now a real platform surface and should deploy
independently from the backend services.

1. build the web app with `pnpm build:web`
2. publish the generated `apps/web/out` artifact
3. sync the artifact to the environment-specific S3 bucket
4. invalidate the CloudFront distribution after upload

### Required frontend environment variables

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DOCS_URL`
- `NEXT_PUBLIC_ANDROID_APP_URL`
- `NEXT_PUBLIC_SITE_BASE_PATH`
- `WEB_FRONTEND_BUCKET`

The GitHub Actions deployment workflow now builds the web app and uploads the
static artifact before any bucket sync step, so frontend delivery can be traced
separately from service image rollout.

## NestJS public API deployment path

The `services/platform-api` service is the dedicated NestJS integration surface
for future mobile and external clients.

Recommended production shape:

1. deploy the service as its own container workload
2. expose it behind a dedicated API URL or reverse-proxied path
3. publish Swagger docs separately from the client web shell
4. keep auth, rate limiting, and observability at this edge layer
5. run Redis beside the public API so shared cache and future distributed rate limiting stay external to any single container

### Required API runtime variables

- `HOST`
- `PORT`
- `DATABASE_URL`
- `API_PUBLIC_URL`
- `API_DOCS_PATH`
- `API_CORS_ORIGINS`
- `REDIS_URL`
- `CACHE_TTL_SECONDS`
- `REQUEST_TIMEOUT_MS`
- `HTTP_RETRY_ATTEMPTS`
- `HTTP_RETRY_BACKOFF_MS`

For the temporary EC2-based rollout, a separate reverse-proxied API path is an
acceptable bridge until the service moves onto its own ECS/Fargate deployment
and dedicated hostname.

### Current production-foundation additions

- run a dedicated Redis instance for shared cache state
- attach `x-correlation-id` to every Fastify/Nest request at the platform edge
- use Redis-backed caching for public profiles, clinics, and jobs reads
- keep retry/backoff and timeout knobs configurable per environment
- provision VPC, RDS, Redis, NATS, and ECS service infrastructure from reusable Terraform modules
- deploy internal identity, profiles, clinics, scheduling, and notifications services on private ECS networking with Cloud Map service discovery
- expose the API gateway and public Nest platform API independently behind the public ALB
- keep runtime integration secrets in AWS Secrets Manager and inject them into ECS tasks instead of baking them into images

## Current ECS service graph

- public edge: `platform-api` on `/platform-api/*`
- public edge: `api-gateway` on `/v1` and `/v1/*`
- private services: `identity`, `profiles`, `clinics`, `scheduling`, `notifications`
- shared backbone: RDS PostgreSQL, ElastiCache Redis, NATS JetStream, Cloud Map private DNS namespace

## Required Terraform inputs for full rollout

### Service image variables

- `PLATFORM_API_IMAGE`
- `API_GATEWAY_IMAGE`
- `IDENTITY_IMAGE`
- `PROFILES_IMAGE`
- `CLINICS_IMAGE`
- `SCHEDULING_IMAGE`
- `NOTIFICATIONS_IMAGE`

### Auth and integration variables

- `API_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `KEYCLOAK_BASE_URL`
- `KEYCLOAK_ADMIN_USERNAME`
- `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_ADMIN_REALM`
- `KEYCLOAK_PUBLIC_CLIENT_ID`
- `AUTH_API_CLIENT_ID`
- `AUTH_REALM`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_EMAIL`

### Storage variables

- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_REGION`
- `STORAGE_PUBLIC_BUCKET`
- `STORAGE_PRIVATE_BUCKET`
- `STORAGE_PUBLIC_BASE_URL`
