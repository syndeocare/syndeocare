import {
  appNotificationListResponseSchema,
  appNotificationSchema,
  createAppNotificationInputSchema,
  deleteNotificationsResponseSchema,
  domainEventCatalog,
  markAllNotificationsReadResponseSchema,
  notificationCountResponseSchema,
  notificationDeliveryResponseSchema,
  notificationEmailRequestSchema,
} from "@repo/contracts";
import {
  countNotificationsForExternalUserId,
  createNotificationForExternalUserId,
  deleteAllNotificationsForExternalUserId,
  deleteNotificationForExternalUserId,
  getActorExternalUserIdBySubject,
  listNotificationsForExternalUserId,
  markAllNotificationsReadForExternalUserId,
  markNotificationReadForExternalUserId,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const resendResponseSchema = notificationDeliveryResponseSchema.extend({
  accepted: notificationDeliveryResponseSchema.shape.accepted.default(true),
});
const actorParamsSchema = z.object({
  subject: z.string().min(1),
});
const notificationParamsSchema = z.object({
  subject: z.string().min(1),
  notificationId: z.string().uuid(),
});

async function requireExternalUserId(subject: string) {
  const externalUserId = await getActorExternalUserIdBySubject(subject);

  if (!externalUserId) {
    throw new Error(
      "The authenticated actor has not synced a legacy external user id yet.",
    );
  }

  return externalUserId;
}

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

    app.get(
      "/internal/actors/:subject/notifications",
      async (request, reply) => {
        const parsedParams = actorParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject is required.",
          });
        }

        try {
          const externalUserId = await requireExternalUserId(
            parsedParams.data.subject,
          );

          return appNotificationListResponseSchema.parse({
            items: await listNotificationsForExternalUserId(externalUserId),
          });
        } catch (error) {
          return reply.code(404).send({
            code: "NOTIFICATION_RECIPIENT_NOT_SYNCED",
            message:
              error instanceof Error
                ? error.message
                : "Notification recipient could not be resolved.",
          });
        }
      },
    );

    app.post("/internal/notifications", async (request, reply) => {
      const parsedBody = createAppNotificationInputSchema.safeParse(
        request.body,
      );

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid in-app notification payload is required.",
        });
      }

      return appNotificationSchema.parse(
        await createNotificationForExternalUserId(parsedBody.data),
      );
    });

    app.get(
      "/internal/notifications/recipient/:externalUserId/count",
      async (request, reply) => {
        const parsedParams = z
          .object({ externalUserId: z.string().min(1) })
          .safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid external user identifier is required.",
          });
        }

        return notificationCountResponseSchema.parse({
          count: await countNotificationsForExternalUserId(
            parsedParams.data.externalUserId,
          ),
        });
      },
    );

    app.patch(
      "/internal/actors/:subject/notifications/read-all",
      async (request, reply) => {
        const parsedParams = actorParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject is required.",
          });
        }

        try {
          const externalUserId = await requireExternalUserId(
            parsedParams.data.subject,
          );

          return markAllNotificationsReadResponseSchema.parse({
            updated:
              await markAllNotificationsReadForExternalUserId(externalUserId),
          });
        } catch (error) {
          return reply.code(404).send({
            code: "NOTIFICATION_RECIPIENT_NOT_SYNCED",
            message:
              error instanceof Error
                ? error.message
                : "Notification recipient could not be resolved.",
          });
        }
      },
    );

    app.patch(
      "/internal/actors/:subject/notifications/:notificationId/read",
      async (request, reply) => {
        const parsedParams = notificationParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid notification identifier is required.",
          });
        }

        try {
          const externalUserId = await requireExternalUserId(
            parsedParams.data.subject,
          );
          const notification = await markNotificationReadForExternalUserId(
            externalUserId,
            parsedParams.data.notificationId,
          );

          if (!notification) {
            return reply.code(404).send({
              code: "NOTIFICATION_NOT_FOUND",
              message: "The requested notification could not be found.",
            });
          }

          return appNotificationSchema.parse(notification);
        } catch (error) {
          return reply.code(404).send({
            code: "NOTIFICATION_RECIPIENT_NOT_SYNCED",
            message:
              error instanceof Error
                ? error.message
                : "Notification recipient could not be resolved.",
          });
        }
      },
    );

    app.delete(
      "/internal/actors/:subject/notifications/:notificationId",
      async (request, reply) => {
        const parsedParams = notificationParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid notification identifier is required.",
          });
        }

        try {
          const externalUserId = await requireExternalUserId(
            parsedParams.data.subject,
          );

          return deleteNotificationsResponseSchema.parse({
            deleted: await deleteNotificationForExternalUserId(
              externalUserId,
              parsedParams.data.notificationId,
            ),
          });
        } catch (error) {
          return reply.code(404).send({
            code: "NOTIFICATION_RECIPIENT_NOT_SYNCED",
            message:
              error instanceof Error
                ? error.message
                : "Notification recipient could not be resolved.",
          });
        }
      },
    );

    app.delete(
      "/internal/actors/:subject/notifications",
      async (request, reply) => {
        const parsedParams = actorParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject is required.",
          });
        }

        try {
          const externalUserId = await requireExternalUserId(
            parsedParams.data.subject,
          );

          return deleteNotificationsResponseSchema.parse({
            deleted:
              await deleteAllNotificationsForExternalUserId(externalUserId),
          });
        } catch (error) {
          return reply.code(404).send({
            code: "NOTIFICATION_RECIPIENT_NOT_SYNCED",
            message:
              error instanceof Error
                ? error.message
                : "Notification recipient could not be resolved.",
          });
        }
      },
    );
  },
});
