# 0002 - Build the backend as microservices with event-driven architecture

## Status

Accepted

## Context

The platform must support independent domain ownership, secure boundaries, and
asynchronous workflow orchestration.

## Decision

Implement the backend as **real microservices** with **EDA** for workflow
coordination, fan-out, and side effects.

## Consequences

- each domain has explicit ownership and integration contracts
- the API gateway remains the public front door
- event schema governance becomes mandatory
- observability and idempotency must be first-class concerns
