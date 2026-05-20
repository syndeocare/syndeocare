import { domainEventCatalog } from "@repo/contracts";
import { getClinicProfileBySubject } from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});

void startService({
  serviceName: "clinics",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.clinics,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "clinics",
      responsibility: "Clinic and facility domain management.",
    }));

    app.get("/internal/clinics/:subject", async (request, reply) => {
      const parsed = subjectParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Subject is required.",
        });
      }

      const clinic = await getClinicProfileBySubject(parsed.data.subject);

      if (!clinic) {
        return reply.code(404).send({
          code: "CLINIC_NOT_FOUND",
          message: "No clinic profile was found for the provided auth subject.",
        });
      }

      return clinic;
    });
  },
});
