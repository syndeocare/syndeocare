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
- `object-storage` for public/private S3 buckets, browser upload CORS, and ECS task bucket access policy wiring
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
- when running the temporary containerized gateway outside Terraform, set `SERVICE_IDENTITY_URL`, `SERVICE_PROFILES_URL`, `SERVICE_CLINICS_URL`, `SERVICE_SCHEDULING_URL`, and `SERVICE_NOTIFICATIONS_URL`; if they are omitted in `NODE_ENV=production`, the gateway falls back to Docker service DNS names such as `http://identity:4111` instead of localhost
- manually-created temporary S3 upload buckets must have browser upload CORS enabled for the deployed app origin, including `PUT`, `GET`, `HEAD`, `content-type`, and exposed `ETag`; otherwise presigned S3 uploads fail in the browser as `Failed to fetch`
- while running the temporary EC2 deployment outside Terraform, keep service DNS names and storage bucket CORS aligned with the deployed gateway and frontend origins

## Frontend deployment path

The `apps/web` frontend is now a real platform surface and should deploy
independently from the backend services.

1. build the web app with `pnpm build:web`
2. publish the generated `apps/web/dist` artifact
3. sync the artifact to the environment-specific S3 bucket
4. invalidate the CloudFront distribution after upload

### Required frontend environment variables

- `VITE_API_GATEWAY_BASE_URL`
- `VITE_PLATFORM_API_BASE_URL`
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
- provision the public/private upload buckets through the shared object-storage module so presigned browser uploads have the required bucket CORS
- deploy internal identity, profiles, clinics, scheduling, and notifications services on private ECS networking with Cloud Map service discovery
- expose the API gateway and public Nest platform API independently behind the public ALB
- keep runtime integration secrets in AWS Secrets Manager and inject them into ECS tasks instead of baking them into images
- grant ECS execution roles explicit `secretsmanager:GetSecretValue` access for every secret referenced through task-definition `secrets`
- keep the public Nest platform API mounted on `/platform-api/v1` and align the ALB target-group health check with that same path

## Current ECS service graph

- public edge: `platform-api` on `/platform-api/*`
- public edge: `api-gateway` on `/v1` and `/v1/*`
- private services: `identity`, `profiles`, `clinics`, `scheduling`, `notifications`
- shared backbone: RDS PostgreSQL, ElastiCache Redis, NATS JetStream, Cloud Map private DNS namespace

### Current dev validation snapshot

- API gateway metadata: `http://syndeocare-dev-alb-1930045459.us-east-1.elb.amazonaws.com/v1`
- platform API metadata: `http://syndeocare-dev-alb-1930045459.us-east-1.elb.amazonaws.com/platform-api/v1`
- platform API health: `http://syndeocare-dev-alb-1930045459.us-east-1.elb.amazonaws.com/platform-api/v1/health/live`

## Database bootstrap for ECS environments

Fresh RDS environments do not become application-ready until the persistence
schema and seed data are applied.

Use the in-cluster bootstrap helper:

```sh
infra/scripts/run-db-bootstrap.sh dev
```

The script launches a one-off Fargate task from the live `profiles` task
definition, reuses its private subnets, security groups, and `DATABASE_URL`
secret, then runs the built migration and seed scripts inside the cluster where
RDS is reachable.

Use this after first-time environment creation, after replacing the database,
or whenever live logs show missing relations such as `relation "actors" does
not exist`.

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
- `VITE_API_GATEWAY_BASE_URL`
- `VITE_PLATFORM_API_BASE_URL`
- `KEYCLOAK_BASE_URL`
- `KEYCLOAK_ADMIN_USERNAME`
- `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_ADMIN_REALM`
- `KEYCLOAK_PUBLIC_CLIENT_ID`
- `AUTH_API_CLIENT_ID`
- `AUTH_REALM`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_EMAIL`

### Google sign-in

Google sign-in is brokered through Keycloak with the `google` identity-provider
alias. Create an OAuth client in Google Cloud and add the Keycloak broker
callback as an authorized redirect URI:

```text
${KEYCLOAK_BASE_URL}/realms/${AUTH_REALM}/broker/google/endpoint
```

The web app callback is handled by the SyndeoCare frontend:

```text
https://syndeocare.ai/auth/oauth/callback
```

Set `GOOGLE_OAUTH_CLIENT_ID` as an environment variable and
`GOOGLE_OAUTH_CLIENT_SECRET` as a secret before deploying. The identity service
will create or update the Keycloak Google provider at startup when both values
are present.

### Storage variables

- `STORAGE_ACCESS_KEY_ID` (optional when ECS task IAM provides S3 access)
- `STORAGE_SECRET_ACCESS_KEY` (optional when ECS task IAM provides S3 access)
- `STORAGE_REGION`
- `STORAGE_PUBLIC_BUCKET`
- `STORAGE_PRIVATE_BUCKET`
- `STORAGE_PUBLIC_BASE_URL`

The Terraform environments now compose `modules/object-storage` directly, so the
bucket names above should map to Terraform-managed buckets rather than
manually-created S3 resources. That module also owns the upload CORS rules used
by browser-side presigned `PUT` uploads.
