import {
  apiErrorSchema,
  authPrincipalSchema,
  bookingDetailSchema,
  bookingListResponseSchema,
  clinicProfileSummarySchema,
  domainEventCatalog,
  gatewayAuthConfigurationSchema,
  initialV1RouteCatalog,
  jobListingDetailSchema,
  jobListingListResponseSchema,
  onboardingSubmissionInputSchema,
  onboardingStatusSchema,
  platformMetadataSchema,
  professionalProfileUpdateInputSchema,
  professionalProfileSummarySchema,
  clinicProfileUpdateInputSchema,
  verificationReviewInputSchema,
  verificationStatusResponseSchema,
  type AuthPrincipal,
  type BookingDetail,
  type JobListingDetail,
  type PlatformMetadata,
} from "@repo/contracts";
import { createAccessControl, startService } from "@repo/service-core";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const INTERNAL_SERVICE_TOKEN_HEADER = "x-internal-service-token";
const downstreamServices = {
  clinics: process.env.SERVICE_CLINICS_URL ?? "http://127.0.0.1:4113",
  identity: process.env.SERVICE_IDENTITY_URL ?? "http://127.0.0.1:4111",
  profiles: process.env.SERVICE_PROFILES_URL ?? "http://127.0.0.1:4112",
} as const;

const jobs = [
  {
    id: "job-shift-001",
    title: "Temporary Dental Assistant Shift",
    specialty: "Dental Assistant",
    employmentType: "temporary_shift",
    status: "open",
    clinicId: "clinic-sanaa-001",
    clinicName: "Al Noor Dental Center",
    location: {
      city: "Sanaa",
      region: "Amanat Al Asimah",
      latitude: 15.3694,
      longitude: 44.191,
      radiusKm: 12,
    },
    startsAt: "2026-05-22T05:00:00.000Z",
    endsAt: "2026-05-22T13:00:00.000Z",
    compensation: {
      amount: 18000,
      currency: "YER",
      unit: "shift",
    },
    verificationRequired: true,
    summary: "Same-day dental assistant coverage for a high-volume clinic.",
    languages: ["ar", "en"],
    description:
      "Support chairside procedures, sterilization workflow, and patient preparation during a busy morning-to-afternoon shift.",
    requirements: [
      "Active dental assistant license",
      "At least 2 years of chairside support experience",
      "Comfort working with digital x-ray workflow",
    ],
    contactPreference: "in_app_chat",
  },
  {
    id: "job-permanent-002",
    title: "General Dentist",
    specialty: "Dentist",
    employmentType: "permanent_role",
    status: "open",
    clinicId: "clinic-aden-002",
    clinicName: "Aden Specialist Medical Center",
    location: {
      city: "Aden",
      region: "Aden",
      latitude: 12.7797,
      longitude: 45.0367,
      radiusKm: 20,
    },
    startsAt: "2026-06-01T05:00:00.000Z",
    compensation: {
      amount: 420000,
      currency: "YER",
      unit: "contract",
    },
    verificationRequired: true,
    summary:
      "Permanent general dentistry role with growth into clinic leadership.",
    languages: ["ar", "en"],
    description:
      "Lead general dentistry appointments, coordinate treatment plans, and support quality assurance for long-term patient relationships.",
    requirements: [
      "Valid dentist license",
      "Minimum 4 years of clinic practice",
      "Strong patient communication and case documentation",
    ],
    contactPreference: "direct_phone",
  },
] satisfies JobListingDetail[];

const bookings = [
  {
    id: "booking-001",
    jobId: "job-shift-001",
    jobTitle: "Temporary Dental Assistant Shift",
    status: "confirmed",
    clinicId: "clinic-sanaa-001",
    clinicName: "Al Noor Dental Center",
    professionalId: "profile-dental-assistant-001",
    professionalName: "Aseel Mohammed",
    startsAt: "2026-05-22T05:00:00.000Z",
    endsAt: "2026-05-22T13:00:00.000Z",
    location: {
      city: "Sanaa",
      region: "Amanat Al Asimah",
      latitude: 15.3694,
      longitude: 44.191,
      radiusKm: 12,
    },
    compensation: {
      amount: 18000,
      currency: "YER",
      unit: "shift",
    },
    requestedAt: "2026-05-20T08:30:00.000Z",
    lastUpdatedAt: "2026-05-20T10:15:00.000Z",
    notes: "Bring clinic-issued ID for front-desk verification on arrival.",
  },
  {
    id: "booking-002",
    jobId: "job-permanent-002",
    jobTitle: "General Dentist",
    status: "requested",
    clinicId: "clinic-aden-002",
    clinicName: "Aden Specialist Medical Center",
    professionalId: "profile-dentist-002",
    professionalName: "Dr. Rawan Saleh",
    startsAt: "2026-06-01T05:00:00.000Z",
    location: {
      city: "Aden",
      region: "Aden",
      latitude: 12.7797,
      longitude: 45.0367,
      radiusKm: 20,
    },
    compensation: {
      amount: 420000,
      currency: "YER",
      unit: "contract",
    },
    requestedAt: "2026-05-20T12:00:00.000Z",
    lastUpdatedAt: "2026-05-20T12:00:00.000Z",
    notes: "Pending final clinic review and credential confirmation.",
  },
] satisfies BookingDetail[];

const jobFiltersSchema = z.object({
  specialty: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  employmentType: z
    .enum(["temporary_shift", "permanent_role", "contract"])
    .optional(),
  verificationRequired: z.enum(["true", "false"]).optional(),
});

const jobIdParamsSchema = z.object({
  jobId: z.string().min(1),
});

const bookingIdParamsSchema = z.object({
  bookingId: z.string().min(1),
});

const auth = createAccessControl();

function toJsonSchema(schema: z.ZodTypeAny, name: string) {
  return zodToJsonSchema(schema, {
    name,
    target: "jsonSchema7",
    $refStrategy: "none",
  });
}

function buildValidationError(issues: z.ZodIssue[]) {
  return {
    code: "VALIDATION_ERROR",
    message: "Invalid request parameters.",
    details: issues.map((issue) => {
      const path = issue.path.join(".");
      return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

function notFoundError(message: string) {
  return {
    code: "NOT_FOUND",
    message,
  };
}

function serviceUnavailableError(message: string) {
  return {
    code: "DOWNSTREAM_SERVICE_UNAVAILABLE",
    message,
  };
}

function downstreamSchemaError(message: string) {
  return {
    code: "DOWNSTREAM_SCHEMA_ERROR",
    message,
  };
}

function buildInternalServiceHeaders() {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  const token = process.env.INTERNAL_SERVICE_TOKEN;

  if (token) {
    headers[INTERNAL_SERVICE_TOKEN_HEADER] = token;
  }

  return headers;
}

type DownstreamServiceName = keyof typeof downstreamServices;

type DownstreamResult<T> =
  | { ok: true; data: T }
  | { ok: false; statusCode: number; body: { code: string; message: string } };

function mapDownstreamStatusCode(statusCode: number): 404 | 503 {
  return statusCode === 404 ? 404 : 503;
}

async function requestDownstreamResource<T>(
  serviceName: DownstreamServiceName,
  resourcePath: string,
  schema: z.ZodType<T>,
  options?: {
    method?: "GET" | "PATCH";
    body?: Record<string, unknown>;
  },
): Promise<DownstreamResult<T>> {
  try {
    const response = await fetch(
      new URL(resourcePath, `${downstreamServices[serviceName]}/`),
      {
        method: options?.method ?? "GET",
        headers: {
          ...buildInternalServiceHeaders(),
          ...(options?.body ? { "content-type": "application/json" } : {}),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      },
    );
    const parsedBody = (await response.json().catch(() => undefined)) as
      | Record<string, unknown>
      | undefined;

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        body: {
          code:
            typeof parsedBody?.code === "string"
              ? parsedBody.code
              : "DOWNSTREAM_REQUEST_FAILED",
          message:
            typeof parsedBody?.message === "string"
              ? parsedBody.message
              : `${serviceName} service rejected the request.`,
        },
      };
    }

    const validated = schema.safeParse(parsedBody);

    if (!validated.success) {
      return {
        ok: false,
        statusCode: 502,
        body: downstreamSchemaError(
          `${serviceName} service returned a response that did not match the expected contract.`,
        ),
      };
    }

    return { ok: true, data: validated.data };
  } catch {
    return {
      ok: false,
      statusCode: 503,
      body: serviceUnavailableError(
        `${serviceName} service is unavailable. Check the downstream service URL and health status.`,
      ),
    };
  }
}

function getProfileIdForActor(actor: AuthPrincipal) {
  return actor.profileId ?? "profile-dental-assistant-001";
}

function getClinicIdForActor(actor: AuthPrincipal) {
  return actor.clinicId ?? "clinic-sanaa-001";
}

function buildVisibleBookings(actor: AuthPrincipal) {
  if (actor.role === "admin") {
    return bookings;
  }

  if (actor.role === "clinic") {
    const clinicId = getClinicIdForActor(actor);
    return bookings.filter((booking) => booking.clinicId === clinicId);
  }

  const profileId = getProfileIdForActor(actor);
  return bookings.filter((booking) => booking.professionalId === profileId);
}

function toJobSummary(job: JobListingDetail) {
  return {
    id: job.id,
    title: job.title,
    specialty: job.specialty,
    employmentType: job.employmentType,
    status: job.status,
    clinicId: job.clinicId,
    clinicName: job.clinicName,
    location: job.location,
    startsAt: job.startsAt,
    endsAt: job.endsAt,
    compensation: job.compensation,
    verificationRequired: job.verificationRequired,
    summary: job.summary,
    languages: job.languages,
  };
}

function toBookingSummary(booking: BookingDetail) {
  return {
    id: booking.id,
    jobId: booking.jobId,
    jobTitle: booking.jobTitle,
    status: booking.status,
    clinicId: booking.clinicId,
    clinicName: booking.clinicName,
    professionalId: booking.professionalId,
    professionalName: booking.professionalName,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    location: booking.location,
    compensation: booking.compensation,
  };
}

function buildPlatformMetadata(): PlatformMetadata {
  return {
    message: "SyndeoCare API Gateway",
    apiVersion: "v1",
    upstreamServices: [
      "identity",
      "profiles",
      "clinics",
      "scheduling",
      "messaging",
      "notifications",
    ],
    productSurfaces: [
      "admin-web",
      "clinic-web",
      "clinic-mobile",
      "professional-mobile",
    ],
    auth: auth.configuration,
    routes: initialV1RouteCatalog,
  };
}

void startService({
  serviceName: "api-gateway",
  version: "0.1.0",
  serviceEvents: domainEventCatalog["api-gateway"],
  register(app) {
    app.get(
      "/v1",
      {
        schema: {
          operationId: "getPlatformMetadata",
          summary: "Get API gateway metadata and route catalog",
          tags: ["platform"],
          response: {
            200: toJsonSchema(platformMetadataSchema, "PlatformMetadata"),
          },
        },
      },
      async () => buildPlatformMetadata(),
    );

    app.get(
      "/v1/auth/config",
      {
        schema: {
          operationId: "getAuthConfiguration",
          summary: "Get gateway authentication configuration metadata",
          tags: ["platform", "auth"],
          response: {
            200: toJsonSchema(
              gatewayAuthConfigurationSchema,
              "GatewayAuthConfiguration",
            ),
          },
        },
      },
      async () => auth.configuration,
    );

    app.get(
      "/v1/me",
      {
        schema: {
          operationId: "getAuthenticatedActor",
          summary: "Get the authenticated actor context",
          tags: ["auth"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(authPrincipalSchema, "AuthPrincipal"),
            401: toJsonSchema(apiErrorSchema, "ApiError"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorServiceUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}`,
          authPrincipalSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/onboarding/status",
      {
        schema: {
          operationId: "getOnboardingStatus",
          summary:
            "Get onboarding completion state for the authenticated actor",
          tags: ["onboarding"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(onboardingStatusSchema, "OnboardingStatus"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/onboarding`,
          onboardingStatusSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/verification/status",
      {
        schema: {
          operationId: "getVerificationStatus",
          summary: "Get verification status for the authenticated actor",
          tags: ["verification"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              verificationStatusResponseSchema,
              "VerificationStatusResponse",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/verification`,
          verificationStatusResponseSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/profiles/me",
      {
        schema: {
          operationId: "getCurrentProfessionalProfile",
          summary:
            "Get the professional profile for the authenticated professional",
          tags: ["profiles"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              professionalProfileSummarySchema,
              "ProfessionalProfileSummary",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["professional"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "profiles",
          `/internal/profiles/${encodeURIComponent(actor.sub)}`,
          professionalProfileSummarySchema,
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/clinics/me",
      {
        schema: {
          operationId: "getCurrentClinicProfile",
          summary: "Get the clinic profile for the authenticated clinic actor",
          tags: ["clinics"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              clinicProfileSummarySchema,
              "ClinicProfileSummary",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "clinics",
          `/internal/clinics/${encodeURIComponent(actor.sub)}`,
          clinicProfileSummarySchema,
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/jobs",
      {
        schema: {
          operationId: "listJobs",
          summary: "List open jobs and shifts",
          tags: ["jobs"],
          querystring: {
            type: "object",
            properties: {
              specialty: { type: "string" },
              city: { type: "string" },
              employmentType: {
                type: "string",
                enum: ["temporary_shift", "permanent_role", "contract"],
              },
              verificationRequired: { type: "string", enum: ["true", "false"] },
            },
          },
          response: {
            200: toJsonSchema(
              jobListingListResponseSchema,
              "JobListingListResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
          },
        },
      },
      async (request, reply) => {
        const parsedQuery = jobFiltersSchema.safeParse(request.query);

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedQuery.error.issues));
        }

        const { specialty, city, employmentType, verificationRequired } =
          parsedQuery.data;

        const filteredJobs = jobs.filter((job) => {
          if (
            specialty &&
            job.specialty.toLowerCase() !== specialty.toLowerCase()
          ) {
            return false;
          }

          if (city && job.location.city.toLowerCase() !== city.toLowerCase()) {
            return false;
          }

          if (employmentType && job.employmentType !== employmentType) {
            return false;
          }

          if (
            verificationRequired &&
            job.verificationRequired !== (verificationRequired === "true")
          ) {
            return false;
          }

          return job.status === "open";
        });

        return {
          items: filteredJobs.map(toJobSummary),
          total: filteredJobs.length,
        };
      },
    );

    app.patch(
      "/v1/onboarding/status",
      {
        schema: {
          operationId: "updateOnboardingStatus",
          summary:
            "Update onboarding document state and optionally submit for review",
          tags: ["onboarding"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            onboardingSubmissionInputSchema,
            "OnboardingSubmissionInput",
          ),
          response: {
            200: toJsonSchema(onboardingStatusSchema, "OnboardingStatus"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic", "professional"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = onboardingSubmissionInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/onboarding`,
          onboardingStatusSchema,
          {
            method: "PATCH",
            body: parsedBody.data,
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.patch(
      "/v1/profiles/me",
      {
        schema: {
          operationId: "updateCurrentProfessionalProfile",
          summary: "Update the current professional profile",
          tags: ["profiles"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            professionalProfileUpdateInputSchema,
            "ProfessionalProfileUpdateInput",
          ),
          response: {
            200: toJsonSchema(
              professionalProfileSummarySchema,
              "ProfessionalProfileSummary",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["professional"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = professionalProfileUpdateInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "profiles",
          `/internal/profiles/${encodeURIComponent(actor.sub)}`,
          professionalProfileSummarySchema,
          {
            method: "PATCH",
            body: parsedBody.data,
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.patch(
      "/v1/clinics/me",
      {
        schema: {
          operationId: "updateCurrentClinicProfile",
          summary: "Update the current clinic profile",
          tags: ["clinics"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            clinicProfileUpdateInputSchema,
            "ClinicProfileUpdateInput",
          ),
          response: {
            200: toJsonSchema(
              clinicProfileSummarySchema,
              "ClinicProfileSummary",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = clinicProfileUpdateInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "clinics",
          `/internal/clinics/${encodeURIComponent(actor.sub)}`,
          clinicProfileSummarySchema,
          {
            method: "PATCH",
            body: parsedBody.data,
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.patch(
      "/v1/admin/verification/:subject",
      {
        schema: {
          operationId: "reviewVerification",
          summary: "Review verification for a target actor",
          tags: ["verification", "admin"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["subject"],
            properties: {
              subject: { type: "string" },
            },
          },
          body: toJsonSchema(
            verificationReviewInputSchema,
            "VerificationReviewInput",
          ),
          response: {
            200: toJsonSchema(
              verificationStatusResponseSchema,
              "VerificationStatusResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const parsedParams = z
          .object({ subject: z.string().min(1) })
          .safeParse(request.params);
        const parsedBody = verificationReviewInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid subject and verification review payload are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(parsedParams.data.subject)}/verification`,
          verificationStatusResponseSchema,
          {
            method: "PATCH",
            body: parsedBody.data,
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/jobs/:jobId",
      {
        schema: {
          operationId: "getJobById",
          summary: "Get job or shift details",
          tags: ["jobs"],
          params: {
            type: "object",
            required: ["jobId"],
            properties: {
              jobId: { type: "string" },
            },
          },
          response: {
            200: toJsonSchema(jobListingDetailSchema, "JobListingDetail"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
          },
        },
      },
      async (request, reply) => {
        const parsedParams = jobIdParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const job = jobs.find(
          (candidate) => candidate.id === parsedParams.data.jobId,
        );

        if (!job) {
          return reply.code(404).send(notFoundError("Job was not found."));
        }

        return job;
      },
    );

    app.get(
      "/v1/bookings",
      {
        schema: {
          operationId: "listBookings",
          summary: "List bookings visible to the authenticated actor",
          tags: ["bookings"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(bookingListResponseSchema, "BookingListResponse"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request) => {
        const items = buildVisibleBookings(
          request.authContext as AuthPrincipal,
        ).map(toBookingSummary);

        return {
          items,
          total: items.length,
        };
      },
    );

    app.get(
      "/v1/bookings/:bookingId",
      {
        schema: {
          operationId: "getBookingById",
          summary: "Get booking details visible to the authenticated actor",
          tags: ["bookings"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["bookingId"],
            properties: {
              bookingId: { type: "string" },
            },
          },
          response: {
            200: toJsonSchema(bookingDetailSchema, "BookingDetail"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const parsedParams = bookingIdParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const visibleBookings = buildVisibleBookings(
          request.authContext as AuthPrincipal,
        );
        const booking = visibleBookings.find(
          (candidate) => candidate.id === parsedParams.data.bookingId,
        );

        if (!booking) {
          return reply
            .code(404)
            .send(
              notFoundError(
                "Booking was not found or is not visible to the authenticated actor.",
              ),
            );
        }

        return booking;
      },
    );
  },
});
