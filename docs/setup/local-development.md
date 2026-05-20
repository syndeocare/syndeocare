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
