import { domainEventCatalog } from "@repo/contracts";
import { getProfessionalProfileBySubject } from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});

void startService({
  serviceName: "profiles",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.profiles,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "profiles",
      responsibility: "Professional and user profile lifecycle management.",
    }));

    app.get("/internal/profiles/:subject", async (request, reply) => {
      const parsed = subjectParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Subject is required.",
        });
      }

      const profile = await getProfessionalProfileBySubject(
        parsed.data.subject,
      );

      if (!profile) {
        return reply.code(404).send({
          code: "PROFILE_NOT_FOUND",
          message:
            "No professional profile was found for the provided auth subject.",
        });
      }

      return profile;
    });
  },
});
