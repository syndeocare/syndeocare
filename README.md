# SyndeoCare Platform Monorepo

SyndeoCare is structured as an AWS-oriented **pnpm + Turborepo** monorepo for a
**microservices** platform with **event-driven architecture**, **self-hosted
authentication**, and a stable API front door.

It is a healthcare staffing marketplace connecting **verified professionals**
with **clinics, hospitals, and medical centers** for temporary shifts,
permanent hiring, and direct communication.

## Platform principles

- **Microservices by bounded context**, not a modular monolith
- **EDA for side effects and workflow orchestration**
- **Self-hosted OSS auth** with **Keycloak**
- **Stable public contracts** through an API gateway / BFF
- **AWS-first** deployment with Postgres, ECS/Fargate, Terraform, and OIDC
- **Documentation as a required deliverable** through ADRs and runbooks
- **Arabic-friendly marketplace UX** with trust, speed, and verification at the center

## Product surfaces

- **Admin:** web only
- **Clinics / hospitals:** web + mobile
- **Professionals:** mobile-first / native app only

## Core business scope

- role-based onboarding and verification
- professional profiles, licenses, certifications, and portfolios
- clinic organization profiles and job / shift posting
- search, filtering, and matching by specialty, rating, price, and proximity
- booking lifecycle: request → accept/reject → confirm → service → review
- in-app messaging and notifications
- two-way ratings and reviews
- optional payments and escrow as the platform evolves

## Repository structure

```text
apps/
  docs/              Next.js documentation portal
  web/               Next.js web application
packages/
  cache/             Shared Redis cache helpers
  contracts/         Shared event and API contract types
  eslint-config/     Shared linting rules
  service-core/      Shared Fastify bootstrap/runtime helpers
  typescript-config/ Shared TypeScript baselines
  ui/                Shared React UI package
services/
  api-gateway/
  platform-api/
  identity/
  profiles/
  clinics/
  scheduling/
  messaging/
  notifications/
infra/
  docker/            Local platform containers
  terraform/         AWS infrastructure skeleton
docs/
  adr/
  api/
  architecture/
  runbooks/
  setup/
```

## Tooling

- **Runtime:** Node `20.20.2`
- **Package manager:** pnpm `9.0.0`
- **Monorepo orchestration:** Turborepo
- **Git hooks:** Husky + lint-staged + commitlint
- **Versioning:** Changesets
- **Services:** TypeScript + Fastify domain services plus a NestJS public API
- **Contracts:** Zod-based shared package

## Core commands

```sh
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm validate
pnpm build
pnpm changeset
pnpm version-packages
```

## Quality gates

- `pre-commit` → staged formatting/lint hygiene
- `commit-msg` → Conventional Commits
- `pre-push` → root validation
- CI runs formatting, linting, typechecks, build, and release checks

## Architecture docs

Start here:

- `docs/architecture/platform-overview.md`
- `docs/architecture/product-overview.md`
- `docs/architecture/event-model.md`
- `docs/api/contract-strategy.md`
- `docs/api/initial-v1-contracts.md`
- `docs/api/nest-platform-api.md`
- `docs/architecture/persistence-overview.md`
- `docs/setup/local-development.md`
- `docs/runbooks/deployment.md`
- `docs/adr/`

## Authentication

The platform is designed around **Keycloak** as the self-hosted identity
provider. Application services should validate tokens at the edge and rely on
service-to-service trust within the platform boundary.

Local Keycloak bootstrap assets live in `infra/keycloak/realm-import/`.

## Deployment target

- **Web / docs:** static or Next runtime on AWS
- **Services:** Docker images on **ECS Fargate**
- **Database:** **AWS PostgreSQL**
- **Events:** AWS event backbone
- **Infrastructure:** Terraform

## Git hooks

This repo uses **Husky** at the monorepo root.

- `pre-commit` formats staged files with Prettier
- `pre-push` runs `pnpm validate`
- `commit-msg` enforces Conventional Commits

If you update repo automation later, keep these files aligned:

- `package.json`
- `.husky/*`
- `lint-staged.config.mjs`
- `commitlint.config.cjs`
- `.github/workflows/*`
