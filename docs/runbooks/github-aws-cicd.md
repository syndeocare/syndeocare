# GitHub to AWS CI/CD

This repository is designed so cloud agents can open pull requests, CI can test
the change, and merging to `main` deploys the production web application.

## Current production target

- Frontend bucket: `syndeocare-prod-web-433956820920`
- CloudFront distribution: `EWYG0R5Q8AIOE`
- Public web URL: `https://syndeocare.ai`
- API URL used by the frontend: `https://api.syndeocare.ai`
- Auth URL used by Google/Keycloak: `https://auth.syndeocare.ai`

The frontend is AWS-managed through S3 and CloudFront. The API and auth DNS
records currently point at the static IP `54.221.113.197`. That IP is not an
Elastic IP, EC2 instance, ECS service, load balancer, or Lightsail instance in
AWS account `433956820920` at the time this runbook was written. Because of
that, automated backend deployment is intentionally guarded behind
`BACKEND_DEPLOY_MODE=ecs`.

## Pull request quality gate

Every pull request and every push to `main` runs:

1. `pnpm validate`
2. `pnpm build`
3. `pnpm smoke:web`
4. changeset status for pull requests

The web smoke test builds confidence that the generated SPA artifact references
real bundled assets and that key app routes return the app shell from a local
Vite preview server.

## Production deployment flow

`.github/workflows/deploy-platform.yml` runs automatically on every merge to
`main`.

The automatic production path:

1. installs dependencies with Node `20.20.2` and pnpm `9.0.0`
2. validates the repository
3. builds all packages
4. smoke-tests the web artifact
5. assumes an AWS role through GitHub OIDC
6. rebuilds `apps/web/dist`
7. syncs immutable assets to S3 with long-lived cache headers
8. syncs the app shell to S3 with no-store cache headers
9. invalidates CloudFront
10. smoke-checks the live web URL

No long-lived AWS access keys are required in GitHub.

## Required GitHub environment

Create a GitHub Environment named `production`.

### Required variables

| Name                               | Value                                       |
| ---------------------------------- | ------------------------------------------- |
| `AWS_REGION`                       | `us-east-1`                                 |
| `AWS_GITHUB_ACTIONS_ROLE_ARN`      | IAM role trusted by GitHub OIDC             |
| `WEB_FRONTEND_BUCKET`              | `syndeocare-prod-web-433956820920`          |
| `WEB_FRONTEND_DISTRIBUTION_ID`     | `EWYG0R5Q8AIOE`                             |
| `WEB_PUBLIC_URL`                   | `https://syndeocare.ai`                     |
| `VITE_API_GATEWAY_BASE_URL`        | `https://api.syndeocare.ai/v1`              |
| `VITE_PLATFORM_API_BASE_URL`       | `https://api.syndeocare.ai/platform-api/v1` |
| `VITE_EMAIL_VERIFICATION_REQUIRED` | `true`                                      |
| `KEYCLOAK_BASE_URL`                | `https://auth.syndeocare.ai`                |
| `KEYCLOAK_PUBLIC_CLIENT_ID`        | `syndeocare-web`                            |
| `KEYCLOAK_ADMIN_REALM`             | `master`                                    |
| `KEYCLOAK_ADMIN_USERNAME`          | `admin`                                     |
| `AUTH_API_CLIENT_ID`               | `syndeocare-api`                            |
| `AUTH_REALM`                       | `syndeocare`                                |
| `BACKEND_DEPLOY_MODE`              | `disabled` until ECS is imported/migrated   |

### Backend/Terraform variables for future ECS rollout

Set these only when `BACKEND_DEPLOY_MODE=ecs` and Terraform state has been
moved to a shared backend or the current production resources have been
imported:

- `API_PUBLIC_BASE_URL`
- `GOOGLE_OAUTH_CLIENT_ID`
- `RESEND_FROM_EMAIL`
- `RESEND_TEST_EMAIL`
- `STORAGE_REGION`
- `STORAGE_PUBLIC_BUCKET`
- `STORAGE_PRIVATE_BUCKET`
- `STORAGE_PUBLIC_BASE_URL`
- `ROUTE53_ZONE_NAME`
- `API_DOMAIN_NAME`

### Required secrets for future ECS rollout

These are not needed for frontend-only deployment. They are required only when
backend Terraform deployment is enabled:

- `KEYCLOAK_ADMIN_PASSWORD`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `RESEND_API_KEY`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`

## AWS OIDC role

The GitHub Actions role should trust the GitHub OIDC provider and only allow
this repository's `production` environment to assume it.

Recommended trust condition:

```json
{
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": "repo:syndeocare/syndeocare:environment:production"
  }
}
```

Minimum frontend deployment permissions:

- `s3:ListBucket` on `arn:aws:s3:::syndeocare-prod-web-433956820920`
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on
  `arn:aws:s3:::syndeocare-prod-web-433956820920/*`
- `cloudfront:CreateInvalidation` on distribution `EWYG0R5Q8AIOE`

Add ECR, ECS, Secrets Manager, IAM pass-role, and Terraform-managed resource
permissions only after the backend target is moved into managed AWS
infrastructure.

## Main branch protection

Protect `main` so cloud-agent changes cannot bypass checks:

- require pull requests before merging
- require the `validate` and `changeset-status` checks
- require branches to be up to date before merging
- disallow force pushes
- disallow direct pushes to `main`

## Backend migration note

Do not enable `BACKEND_DEPLOY_MODE=ecs` against production until one of these is
true:

1. the current backend host is replaced by the Terraform ECS/RDS/Redis/NATS
   platform, or
2. the existing production resources are imported into Terraform state and the
   workflow is pointed at a shared remote Terraform backend.

This prevents a merge to `main` from accidentally creating a second production
backend beside the real live one.
