# Contract strategy

The public API must remain stable even while internal services evolve.

## Strategy

- expose clients through the **API gateway**
- publish versioned HTTP contracts under `/v1`
- generate shared client SDKs from source contracts over time
- treat service APIs as internal unless explicitly promoted
- preserve a stable client contract while backend services evolve independently

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
