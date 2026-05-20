# Local development

## Prerequisites

- Node `20.20.2`
- pnpm `9.0.0`
- Docker Desktop or compatible runtime

## Install

```sh
pnpm install
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
