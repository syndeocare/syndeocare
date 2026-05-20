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
AUTH_ISSUER_URL=http://127.0.0.1:8080/realms/syndeocare
AUTH_AUDIENCE=syndeocare-api
AUTH_CLIENT_ID=syndeocare-api
AUTH_REALM=syndeocare
INTERNAL_SERVICE_TOKEN=local-internal-token
SERVICE_IDENTITY_URL=http://127.0.0.1:4111
SERVICE_PROFILES_URL=http://127.0.0.1:4112
SERVICE_CLINICS_URL=http://127.0.0.1:4113
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
