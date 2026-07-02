import {
  adminConversationStartInputSchema,
  conversationListResponseSchema,
  conversationMessageListResponseSchema,
  conversationMessageSchema,
  conversationMessageSendInputSchema,
  conversationSummarySchema,
  deleteResultSchema,
  domainEventCatalog,
  standardConversationStartInputSchema,
} from "@repo/contracts";
import {
  deleteConversationBySubject,
  deleteConversationMessageBySubject,
  listConversationMessagesForSubject,
  listConversationsForSubject,
  sendConversationMessageBySubject,
  startAdminConversationBySubject,
  startStandardConversationBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const conversationParamsSchema = z.object({
  conversationId: z.string().uuid(),
  subject: z.string().min(1),
});
const conversationMessageParamsSchema = conversationParamsSchema.extend({
  messageId: z.string().uuid(),
});

void startService({
  serviceName: "messaging",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.messaging,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "messaging",
      responsibility: "Conversation, message delivery, and inbox workflows.",
    }));

    app.post(
      "/internal/admin/conversations/:subject",
      async (request, reply) => {
        const parsedParams = subjectParamsSchema.safeParse(request.params);
        const parsedBody = adminConversationStartInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid admin subject and target subject are required.",
          });
        }

        const conversation = await startAdminConversationBySubject(
          parsedParams.data.subject,
          parsedBody.data.targetSubject,
        );

        if (!conversation) {
          return reply.code(404).send({
            code: "CONVERSATION_TARGET_NOT_FOUND",
            message:
              "No admin or target actor was found for this conversation.",
          });
        }

        return conversationSummarySchema.parse(conversation);
      },
    );

    app.get("/internal/conversations/:subject", async (request, reply) => {
      const parsedParams = subjectParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid actor subject is required.",
        });
      }

      const conversations = await listConversationsForSubject(
        parsedParams.data.subject,
      );

      return conversationListResponseSchema.parse({
        items: conversations,
        total: conversations.length,
      });
    });

    app.post("/internal/conversations/:subject", async (request, reply) => {
      const parsedParams = subjectParamsSchema.safeParse(request.params);
      const parsedBody = standardConversationStartInputSchema.safeParse(
        request.body,
      );

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid professional and clinic are required.",
        });
      }

      const conversation = await startStandardConversationBySubject(
        parsedParams.data.subject,
        parsedBody.data,
      );

      if (!conversation) {
        return reply.code(404).send({
          code: "CONVERSATION_TARGET_NOT_FOUND",
          message:
            "No visible professional-clinic conversation could be opened.",
        });
      }

      return conversationSummarySchema.parse(conversation);
    });

    app.get(
      "/internal/conversations/:subject/:conversationId/messages",
      async (request, reply) => {
        const parsedParams = conversationParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject and conversation id are required.",
          });
        }

        const messages = await listConversationMessagesForSubject(
          parsedParams.data.subject,
          parsedParams.data.conversationId,
        );

        return conversationMessageListResponseSchema.parse({
          items: messages,
          total: messages.length,
        });
      },
    );

    app.post(
      "/internal/conversations/:subject/:conversationId/messages",
      async (request, reply) => {
        const parsedParams = conversationParamsSchema.safeParse(request.params);
        const parsedBody = conversationMessageSendInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid message payload is required.",
          });
        }

        const message = await sendConversationMessageBySubject({
          subject: parsedParams.data.subject,
          conversationId: parsedParams.data.conversationId,
          ...parsedBody.data,
        });

        if (!message) {
          return reply.code(404).send({
            code: "CONVERSATION_NOT_FOUND",
            message: "No visible conversation was found for this actor.",
          });
        }

        return conversationMessageSchema.parse(message);
      },
    );

    app.delete(
      "/internal/conversations/:subject/:conversationId/messages/:messageId",
      async (request, reply) => {
        const parsedParams = conversationMessageParamsSchema.safeParse(
          request.params,
        );

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid actor subject, conversation id, and message id are required.",
          });
        }

        const result = await deleteConversationMessageBySubject(
          parsedParams.data,
        );

        if (!result.ok) {
          return reply.code(result.statusCode).send({
            code: result.code,
            message: result.message,
          });
        }

        return deleteResultSchema.parse({ deleted: true, id: result.id });
      },
    );

    app.delete(
      "/internal/conversations/:subject/:conversationId",
      async (request, reply) => {
        const parsedParams = conversationParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid actor subject and conversation id are required.",
          });
        }

        const result = await deleteConversationBySubject(parsedParams.data);

        if (!result.ok) {
          return reply.code(result.statusCode).send({
            code: result.code,
            message: result.message,
          });
        }

        return deleteResultSchema.parse({ deleted: true, id: result.id });
      },
    );
  },
});
