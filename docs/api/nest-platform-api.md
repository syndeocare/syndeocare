# NestJS platform API

`services/platform-api` is the dedicated NestJS public API surface for
SyndeoCare.

## Why it exists

- provide a stable external integration layer for web, mobile, and future
  partner services
- keep public API concerns separate from internal domain service boundaries
- expose health checks, OpenAPI docs, and request validation at the edge

## Current route groups

- `GET /v1`
- `GET /v1/health/live`
- `GET /v1/health/ready`
- `GET /v1/profiles`
- `GET /v1/profiles/:profileId`
- `GET /v1/clinics`
- `GET /v1/clinics/:clinicId`
- `GET /v1/jobs`
- `GET /v1/jobs/:jobId`
- `GET /v1/me`
- `GET /v1/onboarding/status`
- `GET /v1/verification/status`
- `GET /v1/bookings`
- `GET /v1/bookings/:bookingId`
- `POST /v1/bookings`

## Testing mode

Until full auth integration is wired through this service, subject-scoped routes
use the temporary header:

- `x-actor-subject`

That keeps the API useful for integration and mobile testing without pretending
auth is finished.

## Docs

Swagger is exposed at:

- `/v1/docs`

and the JSON document at:

- `/v1/docs/json`
