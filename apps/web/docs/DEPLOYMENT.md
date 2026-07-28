# SyndeoCare — Deployment Guide

## Web Deployment

The current live web app is served from AWS S3 and CloudFront at:

- `https://syndeocare.ai`
- `https://www.syndeocare.ai`

Production frontend target:

- S3 bucket: `syndeocare-prod-web-433956820920`
- CloudFront distribution: `EWYG0R5Q8AIOE`

The API gateway and platform API are exposed through the API subdomain:

- `https://api.syndeocare.ai/v1`
- `https://api.syndeocare.ai/platform-api/v1`

Google sign-in depends on Keycloak being reachable from the public internet.
Expose Keycloak on a stable HTTPS host such as `https://auth.syndeocare.ai`,
set `KEYCLOAK_BASE_URL` to that public URL for the gateway and identity
services, and add the broker callback to the Google Cloud OAuth client:

```text
${KEYCLOAK_BASE_URL}/realms/${AUTH_REALM}/broker/google/endpoint
```

The frontend OAuth callback route is:

```text
https://syndeocare.ai/auth/oauth/callback
```

The S3 buckets used for direct browser uploads must allow CORS for the live web
origins:

- `https://syndeocare.ai`
- `https://www.syndeocare.ai`

DNS for `syndeocare.ai` is managed in AWS Route 53. The frontend TLS
certificate is managed by CloudFront/ACM. The current API and auth records point
to `54.221.113.197`; keep backend automation guarded until that target is moved
into managed AWS infrastructure or imported into Terraform.

Production deploys are handled by GitHub Actions after changes merge to `main`.
See `docs/runbooks/github-aws-cicd.md` for the required GitHub environment and
AWS OIDC setup.

To deploy to a custom domain:

1. Go to Project → Settings → Domains
2. Add your custom domain (e.g., `app.syndeocare.ai`)
3. Configure DNS records as instructed

## Environment Variables

| Variable                     | Description                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_API_GATEWAY_BASE_URL`  | Optional API gateway root. Production defaults to `https://api.syndeocare.ai/v1` when omitted.               |
| `VITE_PLATFORM_API_BASE_URL` | Optional platform API root. Production defaults to `https://api.syndeocare.ai/platform-api/v1` when omitted. |
| `GOOGLE_OAUTH_CLIENT_ID`     | Google OAuth client ID, passed to the identity service so it can configure the Keycloak Google provider.     |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret, stored as a backend secret and never exposed to the browser.                     |
| `KEYCLOAK_BASE_URL`          | Public Keycloak base URL used for OAuth redirects, for example `https://auth.syndeocare.ai`.                 |

Edge function secrets (configured in backend):
| Secret | Description |
|--------|-------------|
| `EMAIL_FROM_ADDRESS` | Verified Amazon SES sender address |
| `DATABASE_URL` | Owned platform PostgreSQL connection string |
