# Contract strategy

The public API must remain stable even while internal services evolve.

## Strategy

- expose clients through the **API gateway**
- publish versioned HTTP contracts under `/v1`
- generate shared client SDKs from source contracts over time
- treat service APIs as internal unless explicitly promoted
- preserve a stable client contract while backend services evolve independently
- define contract schemas in `packages/contracts`
- expose OpenAPI documentation from the gateway and service runtime

## Client audience

- **admin web** uses operational and moderation contracts
- **clinic web/mobile** uses hiring, discovery, booking, and messaging contracts
- **professional mobile** uses profile, discovery, booking, messaging, and review contracts

## Workflow sensitivity

These flows must stay especially stable across backend changes:

- onboarding and verification status
- search and matching filters
- booking state transitions
- chat and notification delivery
- ratings and review submission

## Compatibility rules

- additive changes are preferred
- removals require deprecation windows
- breaking changes require versioning and migration notes

## Current implementation baseline

- initial `/v1` contracts now exist in `services/api-gateway`
- shared schemas live in `packages/contracts/src/index.ts`
- gateway auth supports strict Keycloak JWT validation and an explicit development bypass mode
- protected routes document bearer auth in the generated OpenAPI surface
