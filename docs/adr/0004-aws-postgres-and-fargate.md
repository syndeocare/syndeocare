# 0004 - Use AWS PostgreSQL and ECS Fargate

## Status

Accepted

## Context

The platform targets AWS and needs a secure, maintainable deployment model with
managed data services.

## Decision

Use **AWS PostgreSQL** for the primary relational datastore and **ECS Fargate**
for containerized service workloads.

## Consequences

- operational burden stays lower than Kubernetes-first deployment
- services can be deployed independently
- infrastructure should be codified in Terraform modules and environments
