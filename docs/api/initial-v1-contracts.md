# Initial v1 contracts

The API gateway now exposes the first stable `/v1` contract slice for the MVP foundation.

## Public routes

- `GET /v1`
- `GET /v1/auth/config`
- `GET /v1/jobs`
- `GET /v1/jobs/:jobId`

## Protected routes

- `GET /v1/me`
- `GET /v1/onboarding/status`
- `GET /v1/verification/status`
- `GET /v1/profiles/me`
- `GET /v1/clinics/me`
- `GET /v1/bookings`
- `GET /v1/bookings/:bookingId`

## Coverage

This slice establishes:

- auth-aware gateway behavior
- role-aware access rules for professional and clinic contracts
- onboarding and verification contract shapes
- first job and booking contract shapes for client integration
- OpenAPI-ready route schemas backed by shared Zod contracts

## Notes

- The current routes use stable contract shapes with in-memory gateway fixtures while downstream services are still being implemented.
- Strict auth is designed for Keycloak-issued JWTs.
- Local testing is supported through the explicit development bypass mode documented in `docs/setup/local-development.md`.
