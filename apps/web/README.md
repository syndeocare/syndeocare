# SyndeoCare web app

This app is the separate web surface for the new SyndeoCare platform monorepo.

## Purpose

- provide the admin and clinic-oriented web entry point
- stay deployable independently from the backend services
- consume the stable API gateway contract as the platform grows

## Environment

Build-time public variables:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DOCS_URL`
- `NEXT_PUBLIC_ANDROID_APP_URL`

## Commands

```sh
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web start
```

`build` generates a static export in `apps/web/out`, which is intended for S3 +
CloudFront deployment.
