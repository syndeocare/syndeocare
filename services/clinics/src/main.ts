import { domainEventCatalog } from "@repo/contracts";
import {
  getClinicProfileBySubject,
  updateClinicProfileBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const clinicProfileUpdateInputSchema = z.object({
  organizationName: z.string().min(1),
  facilityType: z.string().min(1),
  location: z.object({
    city: z.string().min(1),
    region: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
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

    app.patch("/internal/clinics/:subject", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedBody = clinicProfileUpdateInputSchema.safeParse(request.body);

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid subject and clinic profile payload are required.",
        });
      }

      const clinic = await updateClinicProfileBySubject(
        parsedSubject.data.subject,
        parsedBody.data,
      );

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
