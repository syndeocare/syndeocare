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
  pushTokenDeleteInputSchema,
  pushTokenDeleteResponseSchema,
  pushTokenRegistrationInputSchema,
  pushTokenRegistrationResponseSchema,
} from "@repo/contracts";
import {
  countNotificationsForExternalUserId,
  createNotificationForExternalUserId,
  deleteAllNotificationsForExternalUserId,
  deleteNotificationForExternalUserId,
  deletePushTokensBySubject,
  listNotificationsForExternalUserId,
  markAllNotificationsReadForExternalUserId,
  markNotificationReadForExternalUserId,
  registerPushTokenBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { z } from "zod";

const emailDeliveryResponseSchema = notificationDeliveryResponseSchema.extend({
  accepted: notificationDeliveryResponseSchema.shape.accepted.default(true),
});
const ses = new SESv2Client({});
const actorParamsSchema = z.object({
  subject: z.string().min(1),
});
const notificationParamsSchema = z.object({
  subject: z.string().min(1),
  notificationId: z.string().uuid(),
});

function notificationRecipientIdForSubject(subject: string) {
  return subject;
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

      const fromEmail =
        process.env.EMAIL_FROM_ADDRESS?.trim() ||
        "SyndeoCare <no-reply@syndeocare.ai>";

      try {
        const response = await ses.send(
          new SendEmailCommand({
            FromEmailAddress: fromEmail,
            Destination: { ToAddresses: [parsedBody.data.toEmail] },
            Content: {
              Simple: {
                Subject: { Data: parsedBody.data.subject, Charset: "UTF-8" },
                Body: {
                  Html: { Data: parsedBody.data.html, Charset: "UTF-8" },
                },
              },
            },
          }),
        );

        if (!response.MessageId) {
          throw new Error("Amazon SES did not return a message id.");
        }

        return emailDeliveryResponseSchema.parse({
          accepted: true,
          deliveredTo: parsedBody.data.toEmail,
          providerMessageId: response.MessageId,
        });
      } catch (error) {
        request.log.error(
          {
            err: error,
            recipientDomain: parsedBody.data.toEmail.split("@")[1],
          },
          "Amazon SES could not accept the notification.",
        );

        return reply.code(503).send({
          code: "NOTIFICATION_PROVIDER_UNAVAILABLE",
          message: "Email delivery is temporarily unavailable.",
        });
      }
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
          const externalUserId = notificationRecipientIdForSubject(
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

    app.post(
      "/internal/actors/:subject/push-tokens",
      async (request, reply) => {
        const parsedParams = actorParamsSchema.safeParse(request.params);
        const parsedBody = pushTokenRegistrationInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject is required.",
          });
        }

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid push notification token is required.",
          });
        }

        try {
          return pushTokenRegistrationResponseSchema.parse(
            await registerPushTokenBySubject(
              parsedParams.data.subject,
              parsedBody.data,
            ),
          );
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
      "/internal/actors/:subject/push-tokens",
      async (request, reply) => {
        const parsedParams = actorParamsSchema.safeParse(request.params);
        const parsedBody = pushTokenDeleteInputSchema.safeParse(
          request.body ?? {},
        );

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject is required.",
          });
        }

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid push notification token is required.",
          });
        }

        try {
          return pushTokenDeleteResponseSchema.parse(
            await deletePushTokensBySubject(
              parsedParams.data.subject,
              parsedBody.data,
            ),
          );
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
          const externalUserId = notificationRecipientIdForSubject(
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
          const externalUserId = notificationRecipientIdForSubject(
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
          const externalUserId = notificationRecipientIdForSubject(
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
          const externalUserId = notificationRecipientIdForSubject(
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
