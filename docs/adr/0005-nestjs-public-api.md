# ADR 0005: NestJS public API for external integration

## Status

Accepted

## Context

SyndeoCare already has bounded-context services and an internal gateway
direction, but the platform also needs a stronger public integration surface for
mobile apps and future external clients.

The user explicitly requested a NestJS backend with a separate API URL, strong
documentation, and production-oriented best practices.

## Decision

We introduce `services/platform-api` as a dedicated **NestJS** public API
service.

This service:

- uses **NestJS** with the Fastify adapter
- validates runtime configuration through `@nestjs/config` + Joi
- enables global request validation through `ValidationPipe`
- exposes Swagger / OpenAPI docs
- exposes health probes for liveness and readiness
- reuses the existing persistence/contracts packages instead of duplicating
  domain logic

## Consequences

### Positive

- public API concerns are isolated from the legacy live app
- future mobile clients get a cleaner integration point
- health checks and OpenAPI docs become part of the backend standard
- the service can move to its own dedicated host or ECS service later without
  changing domain repositories

### Trade-offs

- the platform now contains both Fastify domain services and a NestJS edge API
- auth integration is still incremental, so subject-header testing is used as an
  explicit bridge for development until full client auth is connected
