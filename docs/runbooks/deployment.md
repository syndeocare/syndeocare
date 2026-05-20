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

## Baseline flow

1. merge to `main`
2. CI validates repo
3. release workflow versions packages
4. deployment workflow builds images and pushes to ECR
5. Terraform apply and ECS rollout happen through approved environment jobs
