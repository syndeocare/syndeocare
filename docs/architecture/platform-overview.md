# Platform overview

SyndeoCare is organized around these platform layers:

1. **Clients**
   - web
   - docs
   - mobile (to be migrated into this monorepo later)
2. **Edge**
   - API gateway / BFF
   - authentication validation
   - rate limiting and request policy
3. **Domain services**
   - identity
   - profiles
   - clinics
   - scheduling
   - messaging
   - notifications
4. **Platform backbone**
   - PostgreSQL
   - event bus + queues
   - object storage
   - secrets
   - observability

## Boundary rules

- public clients only talk to the **gateway**
- services do not bypass contracts casually
- side effects should publish domain events
- synchronous calls are reserved for user-critical flows
