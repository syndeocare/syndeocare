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
