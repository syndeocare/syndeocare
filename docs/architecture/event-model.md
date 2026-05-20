# Event model

Initial domain events:

- `identity.user.registered`
- `identity.user.authenticated`
- `profiles.profile.created`
- `clinics.clinic.created`
- `scheduling.shift.posted`
- `scheduling.booking.requested`
- `scheduling.booking.confirmed`
- `messaging.message.sent`
- `notifications.notification.requested`
- `notifications.notification.delivered`

## Event standards

- all events use a versioned envelope
- producers own event schemas
- consumers must be idempotent
- cross-service side effects should prefer events over ad hoc RPC
- breaking event changes require an ADR and migration plan
