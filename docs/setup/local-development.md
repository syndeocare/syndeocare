# Local development

## Prerequisites

- Node `20.20.2`
- pnpm `9.0.0`
- Docker Desktop or compatible runtime

## Install

```sh
pnpm install
```

## Database configuration

The persistence layer expects `DATABASE_URL`. By default local development uses:

```sh
postgresql://syndeocare:syndeocare@127.0.0.1:5432/syndeocare
```

## Initialize persistence

```sh
pnpm db:migrate
pnpm db:seed
```

## Start workspace apps

```sh
pnpm dev
```

## NestJS platform API

The monorepo now includes a dedicated NestJS public API service in
`services/platform-api`.

Default local runtime:

```sh
HOST=0.0.0.0
PORT=4300
API_DOCS_PATH=docs
API_PUBLIC_URL=http://127.0.0.1:4300
API_CORS_ORIGINS=http://127.0.0.1:3000,http://127.0.0.1:3001
REDIS_URL=redis://127.0.0.1:6379
CACHE_TTL_SECONDS=60
```

Start it directly with:

```sh
pnpm --filter @repo/platform-api-service dev
```

Docs and health endpoints:

- `GET /v1`
- `GET /v1/health/live`
- `GET /v1/health/ready`
- `GET /v1/docs`

The public directory and jobs endpoints now use Redis-backed response caching, so
bring Redis up locally before exercising those routes:

```sh
docker compose -f infra/docker/docker-compose.local.yml up -d redis
```

For subject-scoped testing before auth is wired end to end, use the temporary
header:

- `x-actor-subject`

## Product context for local work

- admin workflows are web only
- clinic workflows span web and mobile
- professional workflows are mobile-first
- backend changes should preserve stable API behavior for those surfaces

## Gateway auth modes

The API gateway supports two explicit auth modes:

- `AUTH_MODE=strict` for Keycloak JWT validation
- `AUTH_MODE=development-bypass` for local route testing without a live IdP

`development-bypass` should only be enabled when `ENABLE_DEV_AUTH_BYPASS=true`.

### Strict mode variables

```sh
AUTH_MODE=strict
AUTH_ISSUER_URL=http://127.0.0.1:8180/realms/syndeocare
AUTH_AUDIENCE=syndeocare-api
AUTH_CLIENT_ID=syndeocare-api
AUTH_REALM=syndeocare
KEYCLOAK_BASE_URL=http://127.0.0.1:8180
KEYCLOAK_REALM=syndeocare
KEYCLOAK_PUBLIC_CLIENT_ID=syndeocare-web
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
STORAGE_REGION=us-east-1
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
STORAGE_PUBLIC_BUCKET=syndeocare-public-assets
STORAGE_PRIVATE_BUCKET=syndeocare-private-documents
STORAGE_UPLOAD_URL_TTL_SECONDS=900
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_TEST_EMAIL=onboarding@resend.dev
INTERNAL_SERVICE_TOKEN=local-internal-token
SERVICE_IDENTITY_URL=http://127.0.0.1:4111
SERVICE_PROFILES_URL=http://127.0.0.1:4112
SERVICE_CLINICS_URL=http://127.0.0.1:4113
SERVICE_SCHEDULING_URL=http://127.0.0.1:4114
SERVICE_NOTIFICATIONS_URL=http://127.0.0.1:4115
NATS_URL=nats://127.0.0.1:4222
REDIS_URL=redis://127.0.0.1:6379
CACHE_TTL_SECONDS=60
REQUEST_TIMEOUT_MS=5000
HTTP_RETRY_ATTEMPTS=3
HTTP_RETRY_BACKOFF_MS=250
```

`AUTH_JWKS_URI` is optional. If omitted, the gateway derives the Keycloak certs endpoint from `AUTH_ISSUER_URL`.

### Development bypass headers

When `AUTH_MODE=development-bypass`, protected routes accept these headers:

- `x-dev-user-id`
- `x-dev-user-role` (`admin`, `clinic`, or `professional`)
- `x-dev-user-email`
- `x-dev-clinic-id`
- `x-dev-profile-id`
- `x-dev-onboarding-completed`
- `x-dev-verification-status`
- `x-dev-display-name`

## Local Keycloak bootstrap

The local compose stack imports `infra/keycloak/realm-import/syndeocare-realm.json` automatically.

Local users:

- `admin.user / ChangeMe123!`
- `clinic.user / ChangeMe123!`
- `professional.user / ChangeMe123!`

You can start only the auth stack with:

```sh
docker compose -f infra/docker/docker-compose.local.yml up -d postgres keycloak
```

By default local Keycloak binds to `http://127.0.0.1:8180` to avoid common `:8080`
port conflicts with other developer tooling.

## Local object storage

Local object storage runs through the `minio` container on
`http://127.0.0.1:9000`.

Start it and bootstrap the storage buckets with:

```sh
docker compose -f infra/docker/docker-compose.local.yml up -d minio
pnpm storage:bootstrap
```

If `9000` or `9001` are already in use, override them for the compose command and
match `STORAGE_ENDPOINT` to the API port you chose:

```sh
MINIO_API_PORT=9010 MINIO_CONSOLE_PORT=9011 \
docker compose -f infra/docker/docker-compose.local.yml up -d minio
```

The bootstrap creates:

- `syndeocare-public-assets`
- `syndeocare-private-documents`

The gateway now exposes protected presigned upload routes for:

- `POST /v1/uploads/profile-image`
- `POST /v1/uploads/profile-image/complete`
- `POST /v1/uploads/verification-document`
- `POST /v1/uploads/verification-document/complete`

The expected flow is:

1. request a presigned upload URL from the gateway
2. upload the object to MinIO/S3 with the returned `PUT` URL
3. call the matching `/complete` route so the object key is persisted onto the
   professional profile, clinic profile, or onboarding record

For AWS-backed environments, leave `STORAGE_ENDPOINT` unset or blank so the
shared storage package uses the native S3 endpoint instead of the local MinIO
default. Keep `STORAGE_ENDPOINT` only for local object-storage development.

The MinIO admin console is available at `http://127.0.0.1:9001` with
`minioadmin / minioadmin`.

## Local event backbone

The local compose stack now includes **NATS with JetStream** on:

- `nats://127.0.0.1:4222` for service publish / subscribe traffic
- `http://127.0.0.1:8222` for monitoring

Start it with:

```sh
docker compose -f infra/docker/docker-compose.local.yml up -d nats
```

Identity and scheduling now publish domain events into NATS using subjects like:

- `syndeocare.events.identity.user.registered`
- `syndeocare.events.identity.user.authenticated`
- `syndeocare.events.scheduling.shift.posted`
- `syndeocare.events.scheduling.booking.requested`

## Local cache backbone

Redis is available locally on:

- `redis://127.0.0.1:6379`

Start it with:

```sh
docker compose -f infra/docker/docker-compose.local.yml up -d redis
```

The Nest platform API currently uses Redis to cache public profiles, clinics, and
jobs responses so repeated client reads stay off the primary database.

## Local sign-up and sign-in

When the gateway is running in `strict` mode and Keycloak is available, these
public routes provide working local auth:

- `POST /v1/auth/signup`
- `POST /v1/auth/signin`

Example sign-up:

```sh
curl -X POST http://127.0.0.1:4110/v1/auth/signup \
  -H 'content-type: application/json' \
  --data '{
    "email": "tester@example.com",
    "password": "ChangeMe123!",
    "role": "professional",
    "displayName": "Tester Example"
  }'
```

The response includes a bearer token plus the bootstrapped platform actor
context. Use `Authorization: Bearer <accessToken>` for protected `/v1/*` routes.

Sign-up also sends a welcome email through the notifications service using
Resend. For local testing, keep `RESEND_FROM_EMAIL=onboarding@resend.dev` and
set `RESEND_TEST_EMAIL` to the safe inbox you want to receive development mail.

For local service-to-service protection, set the same `INTERNAL_SERVICE_TOKEN` value on the gateway and internal services.

## Validate before pushing

```sh
pnpm validate
pnpm build
```

## Local platform services

Use the local compose stack for foundational dependencies:

```sh
docker compose -f infra/docker/docker-compose.local.yml up -d
```
