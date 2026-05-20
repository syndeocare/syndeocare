# 0001 - Use a pnpm + Turborepo monorepo

## Status

Accepted

## Context

SyndeoCare needs a single repository for web, documentation, shared packages,
microservices, infrastructure code, and platform automation.

## Decision

Use a **pnpm workspace** with **Turborepo** for task orchestration and caching.

## Consequences

- shared configs and contracts can be versioned together
- CI can run affected tasks efficiently
- service and frontend evolution stays coordinated
- repo discipline becomes critical because everything lives together
