# Persistence overview

The first persistence slice uses PostgreSQL as the platform system of record for:

- actor linkage to external auth subjects
- onboarding state
- verification state
- professional profiles
- clinic profiles

## Tables

- `actors`
- `onboarding_records`
- `professional_profiles`
- `clinic_profiles`

## Ownership

- **identity** reads actor, onboarding, and verification data
- **profiles** reads professional profile data
- **clinics** reads clinic profile data

## Current approach

- shared schema and repository helpers live in `packages/persistence`
- SQL migrations live in `packages/persistence/migrations`
- local bootstrap uses `pnpm db:migrate` and `pnpm db:seed`
- services now expose internal read routes backed by PostgreSQL instead of placeholder-only responses

## Next expansion

- add write flows for onboarding completion and verification review
- add scheduling tables for jobs, shifts, and bookings
- add outbox tables for event publication
