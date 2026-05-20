import { domainEventCatalog } from "@repo/contracts";
import {
  getAuthPrincipalBySubject,
  getOnboardingStatusBySubject,
  getVerificationStatusBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});

void startService({
  serviceName: "identity",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.identity,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "identity",
      authProvider: "keycloak",
      responsibility:
        "OIDC, session validation, and access policy enforcement.",
    }));

    app.get("/internal/actors/:subject", async (request, reply) => {
      const parsed = subjectParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Subject is required.",
        });
      }

      const actor = await getAuthPrincipalBySubject(parsed.data.subject);

      if (!actor) {
        return reply.code(404).send({
          code: "ACTOR_NOT_FOUND",
          message: "No actor was found for the provided auth subject.",
        });
      }

      return actor;
    });

    app.get("/internal/actors/:subject/onboarding", async (request, reply) => {
      const parsed = subjectParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Subject is required.",
        });
      }

      const onboardingStatus = await getOnboardingStatusBySubject(
        parsed.data.subject,
      );

      if (!onboardingStatus) {
        return reply.code(404).send({
          code: "ONBOARDING_NOT_FOUND",
          message:
            "No onboarding record was found for the provided auth subject.",
        });
      }

      return onboardingStatus;
    });

    app.get(
      "/internal/actors/:subject/verification",
      async (request, reply) => {
        const parsed = subjectParamsSchema.safeParse(request.params);

        if (!parsed.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "Subject is required.",
          });
        }

        const verificationStatus = await getVerificationStatusBySubject(
          parsed.data.subject,
        );

        if (!verificationStatus) {
          return reply.code(404).send({
            code: "VERIFICATION_NOT_FOUND",
            message:
              "No verification record was found for the provided auth subject.",
          });
        }

        return verificationStatus;
      },
    );
  },
});
