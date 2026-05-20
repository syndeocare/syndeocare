import { z } from "zod";

export const serviceNameSchema = z.enum([
  "api-gateway",
  "identity",
  "profiles",
  "clinics",
  "scheduling",
  "messaging",
  "notifications",
]);

export const eventNameSchema = z.enum([
  "identity.user.registered",
  "identity.user.authenticated",
  "profiles.profile.created",
  "clinics.clinic.created",
  "scheduling.shift.posted",
  "scheduling.booking.requested",
  "scheduling.booking.confirmed",
  "messaging.message.sent",
  "notifications.notification.requested",
  "notifications.notification.delivered",
]);

export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  name: eventNameSchema,
  producer: serviceNameSchema,
  occurredAt: z.string().datetime(),
  subject: z.string(),
  version: z.literal(1),
  payload: z.record(z.string(), z.unknown()),
});

export const domainEventCatalog = {
  "api-gateway": ["notifications.notification.requested"] as const,
  identity: [
    "identity.user.registered",
    "identity.user.authenticated",
  ] as const,
  profiles: ["profiles.profile.created"] as const,
  clinics: ["clinics.clinic.created"] as const,
  scheduling: [
    "scheduling.shift.posted",
    "scheduling.booking.requested",
    "scheduling.booking.confirmed",
  ] as const,
  messaging: ["messaging.message.sent"] as const,
  notifications: [
    "notifications.notification.requested",
    "notifications.notification.delivered",
  ] as const,
} satisfies Record<
  z.infer<typeof serviceNameSchema>,
  readonly z.infer<typeof eventNameSchema>[]
>;

export type ServiceName = z.infer<typeof serviceNameSchema>;
export type EventName = z.infer<typeof eventNameSchema>;
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
