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
- profile images use the public bucket
- verification documents use the private bucket

## Current upload routes

- `POST /v1/uploads/profile-image`
- `POST /v1/uploads/verification-document`

## Next expansion

- persist uploaded asset metadata in PostgreSQL
- attach avatar/logo/document keys to professional and clinic records
- add malware scanning and document processing workflows
- emit storage events through the event backbone
