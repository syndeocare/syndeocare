import {
  domainEventCatalog,
  notificationDeliveryResponseSchema,
  notificationEmailRequestSchema,
} from "@repo/contracts";
import { startService } from "@repo/service-core";

const resendResponseSchema = notificationDeliveryResponseSchema.extend({
  accepted: notificationDeliveryResponseSchema.shape.accepted.default(true),
});

void startService({
  serviceName: "notifications",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.notifications,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "notifications",
      responsibility: "Email, push, and workflow notification fan-out.",
    }));

    app.post("/internal/notifications/email", async (request, reply) => {
      const parsedBody = notificationEmailRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid email notification payload is required.",
        });
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail =
        process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
      const targetEmail =
        process.env.RESEND_TEST_EMAIL ?? parsedBody.data.toEmail;

      if (!resendApiKey) {
        return reply.code(503).send({
          code: "NOTIFICATION_PROVIDER_UNAVAILABLE",
          message:
            "RESEND_API_KEY is not configured for the notifications service.",
        });
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${resendApiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [targetEmail],
          subject: parsedBody.data.subject,
          html: parsedBody.data.html,
        }),
      });
      const payload = (await response.json().catch(() => undefined)) as
        | Record<string, unknown>
        | undefined;

      if (!response.ok || typeof payload?.id !== "string") {
        return reply.code(503).send({
          code: "NOTIFICATION_PROVIDER_UNAVAILABLE",
          message: "Resend could not accept the notification request.",
        });
      }

      return resendResponseSchema.parse({
        accepted: true,
        deliveredTo: targetEmail,
        providerMessageId: payload.id,
      });
    });
  },
});
