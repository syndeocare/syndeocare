# Initial v1 contracts

The API gateway now exposes the first stable `/v1` contract slice for the MVP foundation.

## Public routes

- `GET /v1`
- `GET /v1/auth/config`
- `POST /v1/auth/signin`
- `POST /v1/auth/signup`
- `GET /v1/profiles`
- `GET /v1/profiles/:profileId`
- `GET /v1/clinics`
- `GET /v1/clinics/:clinicId`
- `GET /v1/jobs`
- `GET /v1/jobs/:jobId`

## Protected routes

- `GET /v1/me`
- `GET /v1/onboarding/status`
- `PATCH /v1/onboarding/status`
- `GET /v1/verification/status`
- `GET /v1/profiles/me`
- `PATCH /v1/profiles/me`
- `POST /v1/jobs`
- `POST /v1/uploads/profile-image`
- `POST /v1/uploads/profile-image/complete`
- `GET /v1/clinics/me`
- `PATCH /v1/clinics/me`
- `POST /v1/uploads/verification-document`
- `POST /v1/uploads/verification-document/complete`
- `POST /v1/bookings`
- `GET /v1/bookings`
- `GET /v1/bookings/:bookingId`
- `PATCH /v1/admin/verification/:subject`

## Coverage

This slice establishes:

- auth-aware gateway behavior
- local email/password sign-in and sign-up via Keycloak
- role-aware access rules for professional and clinic contracts
- presigned S3-compatible upload URLs for profile images and verification documents
- persistence of profile image, clinic logo, and uploaded verification document metadata
- public directory browsing for professionals and clinics
- richer professional and clinic profile fields for marketplace trust
- onboarding and verification contract shapes
- onboarding submission and verification review writes
- real job and booking persistence through the scheduling service
- OpenAPI-ready route schemas backed by shared Zod contracts

## Notes

- jobs, bookings, profiles, and clinics now flow through real downstream services instead of in-memory gateway fixtures.
- Strict auth is designed for Keycloak-issued JWTs.
- Local testing is supported through the explicit development bypass mode documented in `docs/setup/local-development.md`.
