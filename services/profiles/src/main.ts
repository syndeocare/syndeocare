import {
  domainEventCatalog,
  professionalProfileUpdateInputSchema,
} from "@repo/contracts";
import {
  getProfessionalProfileById,
  getProfessionalProfileBySubject,
  listProfessionalProfiles,
  persistProfessionalProfileImageBySubject,
  updateProfessionalProfileBySubject,
} from "@repo/persistence";
import { startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const profileIdParamsSchema = z.object({
  profileId: z.string().min(1),
});
const profileDirectoryFiltersSchema = z.object({
  city: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  specialty: z.string().min(1).optional(),
  verificationStatus: z
    .enum(["not_started", "pending_review", "approved", "rejected"])
    .optional(),
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

    app.get("/internal/profiles", async (request, reply) => {
      const parsedQuery = profileDirectoryFiltersSchema.safeParse(
        request.query,
      );

      if (!parsedQuery.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid professional directory query is required.",
        });
      }

      return listProfessionalProfiles(parsedQuery.data);
    });

    app.get("/internal/profiles/by-id/:profileId", async (request, reply) => {
      const parsedParams = profileIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid profile id is required.",
        });
      }

      const profile = await getProfessionalProfileById(
        parsedParams.data.profileId,
      );

      if (!profile) {
        return reply.code(404).send({
          code: "PROFILE_NOT_FOUND",
          message: "No professional profile was found for the provided id.",
        });
      }

      return profile;
    });

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
