import { domainEventCatalog } from "@repo/contracts";
import {
  getProfessionalProfileBySubject,
  persistProfessionalProfileImageBySubject,
  updateProfessionalProfileBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const professionalProfileUpdateInputSchema = z.object({
  fullName: z.string().min(1),
  specialty: z.string().min(1),
  yearsExperience: z.number().int().nonnegative(),
  languages: z.array(z.string().min(2)).min(1),
  availability: z.object({
    status: z.enum(["available", "limited", "unavailable"]),
    nextAvailableAt: z.string().datetime().optional(),
    locationRadiusKm: z.number().int().positive(),
  }),
  location: z.object({
    city: z.string().min(1),
    region: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});
const finalizeProfileImageInputSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  assetUrl: z.string().url(),
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

    app.patch("/internal/profiles/:subject", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedBody = professionalProfileUpdateInputSchema.safeParse(
        request.body,
      );

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message:
            "A valid subject and professional profile payload are required.",
        });
      }

      const profile = await updateProfessionalProfileBySubject(
        parsedSubject.data.subject,
        parsedBody.data,
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

    app.post("/internal/profiles/:subject/image", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedBody = finalizeProfileImageInputSchema.safeParse(
        request.body,
      );

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid subject and uploaded image payload are required.",
        });
      }

      const profile = await persistProfessionalProfileImageBySubject(
        parsedSubject.data.subject,
        parsedBody.data,
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
