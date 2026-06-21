import {
  clinicProfileUpdateInputSchema,
  domainEventCatalog,
} from "@repo/contracts";
import {
  getClinicProfileById,
  getClinicProfileBySubject,
  listClinicProfiles,
  persistClinicLogoBySubject,
  updateClinicProfileBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const clinicIdParamsSchema = z.object({
  clinicId: z.string().min(1),
});
const clinicDirectoryFiltersSchema = z.object({
  city: z.string().min(1).optional(),
  facilityType: z.string().min(1).optional(),
  verificationStatus: z
    .enum(["not_started", "pending_review", "approved", "rejected"])
    .optional(),
});
const finalizeClinicLogoInputSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  assetUrl: z.string().url(),
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

    app.get("/internal/clinics", async (request, reply) => {
      const parsedQuery = clinicDirectoryFiltersSchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid clinic directory query is required.",
        });
      }

      return listClinicProfiles(parsedQuery.data);
    });

    app.get("/internal/clinics/by-id/:clinicId", async (request, reply) => {
      const parsedParams = clinicIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid clinic id is required.",
        });
      }

      const clinic = await getClinicProfileById(parsedParams.data.clinicId);

      if (!clinic) {
        return reply.code(404).send({
          code: "CLINIC_NOT_FOUND",
          message: "No clinic profile was found for the provided id.",
        });
      }

      return clinic;
    });

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

      let clinic: Awaited<ReturnType<typeof updateClinicProfileBySubject>>;
      try {
        clinic = await updateClinicProfileBySubject(
          parsedSubject.data.subject,
          parsedBody.data,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("phone number is already registered")
        ) {
          return reply.code(409).send({
            code: "PHONE_ALREADY_REGISTERED",
            message: error.message,
          });
        }

        throw error;
      }

      if (!clinic) {
        return reply.code(404).send({
          code: "CLINIC_NOT_FOUND",
          message: "No clinic profile was found for the provided auth subject.",
        });
      }

      return clinic;
    });

    app.post("/internal/clinics/:subject/logo", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedBody = finalizeClinicLogoInputSchema.safeParse(request.body);

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid subject and uploaded logo payload are required.",
        });
      }

      const clinic = await persistClinicLogoBySubject(
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
