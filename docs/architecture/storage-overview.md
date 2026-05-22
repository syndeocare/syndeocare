# Storage overview

The first storage slice uses S3-compatible object storage for:

- profile and clinic avatar / logo images
- verification and onboarding document uploads

## Local development

- local storage runs through `minio` on `http://127.0.0.1:9000`
- buckets are bootstrapped with `pnpm storage:bootstrap`
- the initial buckets are:
  - `syndeocare-public-assets`
  - `syndeocare-private-documents`

## Current approach

- shared storage helpers live in `packages/storage`
- the API gateway issues presigned upload URLs for the current authenticated actor
- the gateway also verifies bucket ownership/object existence before persisting uploaded keys
- profile images use the public bucket
- verification documents use the private bucket
- persisted image/logo URLs and uploaded verification documents are stored in PostgreSQL

## Current upload routes

- `POST /v1/uploads/profile-image`
- `POST /v1/uploads/profile-image/complete`
- `POST /v1/uploads/verification-document`
- `POST /v1/uploads/verification-document/complete`

## Next expansion

- add malware scanning and document processing workflows
- emit storage events through the event backbone
