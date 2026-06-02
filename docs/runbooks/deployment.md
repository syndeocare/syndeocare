# Deployment runbook

## Environments

- `dev`
- `staging`
- `prod`

## Principles

- use GitHub Actions with AWS OIDC
- never store long-lived AWS keys in GitHub secrets
- treat Terraform as the source of truth for infrastructure
- require reviewed promotion into higher environments
- preserve client-facing API compatibility during backend changes
- keep deployment decisions aligned with the product surface split across admin, clinics, and professionals
- host the web frontend separately from the domain services so frontend release cadence does not block core backend rollout

## Baseline flow

1. merge to `main`
2. CI validates repo
3. release workflow versions packages
4. deployment workflow builds images and pushes to ECR
5. Terraform apply and ECS rollout happen through approved environment jobs
6. static frontend assets deploy independently through CloudFront/S3 (preferred) rather than a dedicated EC2 instance

## Product-aware deployment notes

- admin web releases should not block professional mobile flows
- verification and trust workflows must remain available during service rollout
- booking, messaging, and notifications should be treated as critical business paths
- prefer **S3 + CloudFront** for the public web frontend; reserve EC2 for workloads that truly need long-running servers
- run backend services and NATS on the private platform network boundary, not on the same host as the static frontend

## Frontend deployment path

The `apps/web` frontend is now a real platform surface and should deploy
independently from the backend services.

1. build the web app with `pnpm build:web`
2. publish the generated `apps/web/out` artifact
3. sync the artifact to the environment-specific S3 bucket
4. invalidate the CloudFront distribution after upload

### Required frontend environment variables

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DOCS_URL`
- `NEXT_PUBLIC_ANDROID_APP_URL`
- `NEXT_PUBLIC_SITE_BASE_PATH`
- `WEB_FRONTEND_BUCKET`

The GitHub Actions deployment workflow now builds the web app and uploads the
static artifact before any bucket sync step, so frontend delivery can be traced
separately from service image rollout.
