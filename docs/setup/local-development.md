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

### Strict mode variables

```sh
AUTH_MODE=strict
AUTH_ISSUER_URL=https://identity.example.com/realms/syndeocare
AUTH_AUDIENCE=syndeocare-api
AUTH_CLIENT_ID=syndeocare-api
AUTH_REALM=syndeocare
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
