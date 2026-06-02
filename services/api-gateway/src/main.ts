import {
  apiErrorSchema,
  authSessionSchema,
  bookingRequestInputSchema,
  authSignInInputSchema,
  authSignUpInputSchema,
  authPrincipalSchema,
  bookingDetailSchema,
  bookingListResponseSchema,
  clinicProfileSummarySchema,
  completeProfileImageUploadResponseSchema,
  completeVerificationDocumentUploadResponseSchema,
  domainEventCatalog,
  finalizeProfileImageUploadInputSchema,
  finalizeVerificationDocumentUploadInputSchema,
  gatewayAuthConfigurationSchema,
  initialV1RouteCatalog,
  jobListingCreateInputSchema,
  jobListingDetailSchema,
  jobListingListResponseSchema,
  onboardingSubmissionInputSchema,
  onboardingStatusSchema,
  platformMetadataSchema,
  clinicProfileUpdateInputSchema,
  professionalProfileSummarySchema,
  professionalProfileUpdateInputSchema,
  uploadDescriptorSchema,
  uploadRequestSchema,
  verificationReviewInputSchema,
  verificationStatusResponseSchema,
  type AuthPrincipal,
  type PlatformMetadata,
} from "@repo/contracts";
import {
  assertStoredObjectExists,
  buildStoredAssetUrl,
  createUploadDescriptor,
  getStorageConfig,
  isActorOwnedObjectKey,
} from "@repo/storage";
import { createAccessControl, startService } from "@repo/service-core";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const INTERNAL_SERVICE_TOKEN_HEADER = "x-internal-service-token";
const downstreamServices = {
  clinics: process.env.SERVICE_CLINICS_URL ?? "http://127.0.0.1:4113",
  identity: process.env.SERVICE_IDENTITY_URL ?? "http://127.0.0.1:4111",
  profiles: process.env.SERVICE_PROFILES_URL ?? "http://127.0.0.1:4112",
  scheduling: process.env.SERVICE_SCHEDULING_URL ?? "http://127.0.0.1:4114",
} as const;
const storageConfig = getStorageConfig();

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

function mapSignInDownstreamStatusCode(statusCode: number): 400 | 401 | 503 {
  if (statusCode === 400 || statusCode === 401) {
    return statusCode;
  }

  return 503;
}

function mapSignUpDownstreamStatusCode(statusCode: number): 400 | 409 | 503 {
  if (statusCode === 400 || statusCode === 409) {
    return statusCode;
  }

  return 503;
}

async function requestDownstreamResource<T>(
  serviceName: DownstreamServiceName,
  resourcePath: string,
  schema: z.ZodType<T>,
  options?: {
    method?: "GET" | "PATCH" | "POST";
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

    app.post(
      "/v1/auth/signin",
      {
        schema: {
          operationId: "signIn",
          summary: "Authenticate with email and password",
          tags: ["auth"],
          body: toJsonSchema(authSignInInputSchema, "AuthSignInInput"),
          response: {
            200: toJsonSchema(authSessionSchema, "AuthSession"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorServiceUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authSignInInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid email and password are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/signin",
          authSessionSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapSignInDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/signup",
      {
        schema: {
          operationId: "signUp",
          summary: "Create a new professional or clinic account",
          tags: ["auth"],
          body: toJsonSchema(authSignUpInputSchema, "AuthSignUpInput"),
          response: {
            200: toJsonSchema(authSessionSchema, "AuthSessionSignup"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationSignup"),
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflictSignup"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableSignup",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authSignUpInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid email, password, role, and display name are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/signup",
          authSessionSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapSignUpDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
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
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
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

        const searchParams = new URLSearchParams();

        if (parsedQuery.data.specialty) {
          searchParams.set("specialty", parsedQuery.data.specialty);
        }

        if (parsedQuery.data.city) {
          searchParams.set("city", parsedQuery.data.city);
        }

        if (parsedQuery.data.employmentType) {
          searchParams.set("employmentType", parsedQuery.data.employmentType);
        }

        if (parsedQuery.data.verificationRequired) {
          searchParams.set(
            "verificationRequired",
            parsedQuery.data.verificationRequired,
          );
        }

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/jobs${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
          jobListingListResponseSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(downstream.statusCode === 400 ? 400 : 503)
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/jobs",
      {
        schema: {
          operationId: "createJob",
          summary: "Create a new job or shift for the authenticated clinic",
          tags: ["jobs"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            jobListingCreateInputSchema,
            "JobListingCreateInput",
          ),
          response: {
            200: toJsonSchema(
              jobListingDetailSchema,
              "CreatedJobListingDetail",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationCreateJob"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorizedCreateJob"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbiddenCreateJob"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFoundCreateJob"),
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflictCreateJob"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailableCreateJob"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = jobListingCreateInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/jobs/${encodeURIComponent(actor.sub)}`,
          jobListingDetailSchema,
          {
            body: parsedBody.data,
            method: "POST",
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

    app.post(
      "/v1/uploads/profile-image",
      {
        schema: {
          operationId: "createProfileImageUpload",
          summary:
            "Create a presigned upload URL for the current actor profile image",
          tags: ["uploads"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(uploadRequestSchema, "UploadRequestProfileImage"),
          response: {
            200: toJsonSchema(uploadDescriptorSchema, "UploadDescriptor"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorUploadValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUploadUnauthorized"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic", "professional"] }),
      },
      async (request, reply) => {
        const parsedBody = uploadRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid file name and content type are required.",
          });
        }

        if (!parsedBody.data.contentType.startsWith("image/")) {
          return reply.code(400).send({
            code: "UNSUPPORTED_CONTENT_TYPE",
            message: "Profile image uploads must use an image content type.",
          });
        }

        const actor = request.authContext as AuthPrincipal;
        return createUploadDescriptor({
          actorRole: actor.role,
          actorSubject: actor.sub,
          assetType: "profile-image",
          contentType: parsedBody.data.contentType,
          fileName: parsedBody.data.fileName,
        });
      },
    );

    app.post(
      "/v1/uploads/profile-image/complete",
      {
        schema: {
          operationId: "completeProfileImageUpload",
          summary: "Persist the uploaded profile image or clinic logo",
          tags: ["uploads"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            finalizeProfileImageUploadInputSchema,
            "FinalizeProfileImageUploadInput",
          ),
          response: {
            200: toJsonSchema(
              completeProfileImageUploadResponseSchema,
              "CompleteProfileImageUploadResponse",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadFinalizeValidation",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadFinalizeUnauthorized",
            ),
            404: toJsonSchema(apiErrorSchema, "ApiErrorUploadFinalizeNotFound"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadFinalizeUnavailable",
            ),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic", "professional"] }),
      },
      async (request, reply) => {
        const parsedBody = finalizeProfileImageUploadInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid uploaded image payload is required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;

        if (parsedBody.data.bucket !== storageConfig.publicBucket) {
          return reply.code(400).send({
            code: "UPLOAD_BUCKET_INVALID",
            message:
              "Profile images must be persisted from the public asset bucket.",
          });
        }

        if (
          !isActorOwnedObjectKey({
            actorRole: actor.role,
            actorSubject: actor.sub,
            key: parsedBody.data.key,
          })
        ) {
          return reply.code(400).send({
            code: "UPLOAD_KEY_INVALID",
            message:
              "Uploaded asset key does not belong to the authenticated actor.",
          });
        }

        try {
          await assertStoredObjectExists(parsedBody.data);
        } catch {
          return reply.code(404).send({
            code: "UPLOAD_OBJECT_NOT_FOUND",
            message: "The uploaded asset could not be found in object storage.",
          });
        }

        if (actor.role === "professional") {
          const downstream = await requestDownstreamResource(
            "profiles",
            `/internal/profiles/${encodeURIComponent(actor.sub)}/image`,
            professionalProfileSummarySchema,
            {
              method: "POST",
              body: {
                ...parsedBody.data,
                assetUrl: buildStoredAssetUrl(
                  parsedBody.data.bucket,
                  parsedBody.data.key,
                ),
              },
            },
          );

          if (!downstream.ok) {
            return reply
              .code(mapDownstreamStatusCode(downstream.statusCode))
              .send(downstream.body);
          }

          if (!downstream.data.profileImageUrl) {
            return reply.code(503).send({
              code: "UPLOAD_PERSISTENCE_FAILED",
              message:
                "The persisted professional profile image URL was missing.",
            });
          }

          return {
            persisted: true,
            assetType: "profile-image",
            resource: "professional-profile",
            assetUrl: downstream.data.profileImageUrl,
          };
        }

        const downstream = await requestDownstreamResource(
          "clinics",
          `/internal/clinics/${encodeURIComponent(actor.sub)}/logo`,
          clinicProfileSummarySchema,
          {
            method: "POST",
            body: {
              ...parsedBody.data,
              assetUrl: buildStoredAssetUrl(
                parsedBody.data.bucket,
                parsedBody.data.key,
              ),
            },
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        if (!downstream.data.logoUrl) {
          return reply.code(503).send({
            code: "UPLOAD_PERSISTENCE_FAILED",
            message: "The persisted clinic logo URL was missing.",
          });
        }

        return {
          persisted: true,
          assetType: "profile-image",
          resource: "clinic-profile",
          assetUrl: downstream.data.logoUrl,
        };
      },
    );

    app.post(
      "/v1/uploads/verification-document",
      {
        schema: {
          operationId: "createVerificationDocumentUpload",
          summary: "Create a presigned upload URL for a verification document",
          tags: ["uploads"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(uploadRequestSchema, "UploadRequestDocument"),
          response: {
            200: toJsonSchema(
              uploadDescriptorSchema,
              "UploadDescriptorDocument",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadDocumentValidation",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadDocumentUnauthorized",
            ),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic", "professional"] }),
      },
      async (request, reply) => {
        const parsedBody = uploadRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid file name and content type are required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;
        return createUploadDescriptor({
          actorRole: actor.role,
          actorSubject: actor.sub,
          assetType: "verification-document",
          contentType: parsedBody.data.contentType,
          fileName: parsedBody.data.fileName,
        });
      },
    );

    app.post(
      "/v1/uploads/verification-document/complete",
      {
        schema: {
          operationId: "completeVerificationDocumentUpload",
          summary: "Persist an uploaded verification document",
          tags: ["uploads", "onboarding"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            finalizeVerificationDocumentUploadInputSchema,
            "FinalizeVerificationDocumentUploadInput",
          ),
          response: {
            200: toJsonSchema(
              completeVerificationDocumentUploadResponseSchema,
              "CompleteVerificationDocumentUploadResponse",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadDocumentValidation",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadDocumentUnauthorized",
            ),
            404: toJsonSchema(apiErrorSchema, "ApiErrorUploadDocumentNotFound"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUploadDocumentUnavailable",
            ),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic", "professional"] }),
      },
      async (request, reply) => {
        const parsedBody =
          finalizeVerificationDocumentUploadInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid uploaded verification document payload is required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;

        if (parsedBody.data.bucket !== storageConfig.privateBucket) {
          return reply.code(400).send({
            code: "UPLOAD_BUCKET_INVALID",
            message:
              "Verification documents must be persisted from the private document bucket.",
          });
        }

        if (
          !isActorOwnedObjectKey({
            actorRole: actor.role,
            actorSubject: actor.sub,
            key: parsedBody.data.key,
          })
        ) {
          return reply.code(400).send({
            code: "UPLOAD_KEY_INVALID",
            message:
              "Uploaded asset key does not belong to the authenticated actor.",
          });
        }

        try {
          await assertStoredObjectExists(parsedBody.data);
        } catch {
          return reply.code(404).send({
            code: "UPLOAD_OBJECT_NOT_FOUND",
            message: "The uploaded asset could not be found in object storage.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/onboarding/documents`,
          onboardingStatusSchema,
          {
            method: "POST",
            body: parsedBody.data,
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return {
          persisted: true,
          assetType: "verification-document",
          resource: "onboarding",
          documentType: parsedBody.data.documentType,
          outstandingDocuments: downstream.data.missingDocuments,
          uploadedDocuments: downstream.data.uploadedDocuments,
        };
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
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
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

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/jobs/${encodeURIComponent(parsedParams.data.jobId)}`,
          jobListingDetailSchema,
        );

        if (!downstream.ok) {
          return reply.code(503).send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/bookings",
      {
        schema: {
          operationId: "requestBooking",
          summary: "Request a booking for the authenticated professional",
          tags: ["bookings"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(bookingRequestInputSchema, "BookingRequestInput"),
          response: {
            200: toJsonSchema(bookingDetailSchema, "CreatedBookingDetail"),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationCreateBooking",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedCreateBooking",
            ),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbiddenCreateBooking"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFoundCreateBooking"),
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflictCreateBooking"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnavailableCreateBooking",
            ),
          },
        },
        preHandler: auth.requireAccess({ roles: ["professional"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = bookingRequestInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/bookings/${encodeURIComponent(actor.sub)}`,
          bookingDetailSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(
              downstream.statusCode === 400
                ? 400
                : downstream.statusCode === 403
                  ? 403
                  : downstream.statusCode === 404
                    ? 404
                    : downstream.statusCode === 409
                      ? 409
                      : 503,
            )
            .send(downstream.body);
        }

        return downstream.data;
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
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/bookings/${encodeURIComponent(actor.sub)}`,
          bookingListResponseSchema,
        );

        if (!downstream.ok) {
          return reply.code(503).send(downstream.body);
        }

        return downstream.data;
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
        const actor = request.authContext as AuthPrincipal;
        const parsedParams = bookingIdParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/bookings/${encodeURIComponent(actor.sub)}/${encodeURIComponent(parsedParams.data.bookingId)}`,
          bookingDetailSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(
              downstream.statusCode === 400
                ? 400
                : downstream.statusCode === 404
                  ? 404
                  : 503,
            )
            .send(downstream.body);
        }

        return downstream.data;
      },
    );
  },
});
