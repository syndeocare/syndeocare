# Platform overview

SyndeoCare is organized around these platform layers:

1. **Clients**
   - admin web
   - clinic web
   - clinic mobile
   - professional native mobile
   - docs
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

## Business-aligned domain intent

- **identity** handles Keycloak integration, auth assertions, and access policy
- **profiles** handles professionals, licenses, certifications, and portfolio data
- **clinics** handles organizations, services, and employer operations
- **scheduling** handles job listings, shifts, bookings, and status transitions
- **messaging** handles professional-clinic conversations
- **notifications** handles push, email, and workflow alerts

## Platform constraints

- manual verification remains the MVP trust mechanism
- the gateway protects client compatibility while services evolve
- professionals remain mobile-first, while admin remains web-only
- architecture choices should support Arabic-first regional expansion

## Boundary rules

- public clients only talk to the **gateway**
- services do not bypass contracts casually
- side effects should publish domain events
- synchronous calls are reserved for user-critical flows
