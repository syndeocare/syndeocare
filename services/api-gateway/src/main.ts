import {
  apiErrorSchema,
  authEmailActionResponseSchema,
  authAccountDeletionResponseSchema,
  authEmailOtpConfirmInputSchema,
  authEmailOtpRequestInputSchema,
  authEmailVerificationConfirmInputSchema,
  authEmailVerificationConfirmResponseSchema,
  authEmailVerificationRequestInputSchema,
  authLogoutInputSchema,
  authLogoutResponseSchema,
  authOAuthCallbackInputSchema,
  authOAuthStartInputSchema,
  authOAuthStartResponseSchema,
  authPasswordResetConfirmInputSchema,
  authPasswordResetRequestInputSchema,
  authPasswordUpdateInputSchema,
  authPasswordUpdateResponseSchema,
  authRefreshInputSchema,
  authSessionSchema,
  bookingRequestInputSchema,
  bookingStatusUpdateInputSchema,
  authSignInInputSchema,
  authSignUpInputSchema,
  authPrincipalSchema,
  bookingDetailSchema,
  bookingListResponseSchema,
  clinicProfileListResponseSchema,
  clinicProfileSummarySchema,
  chatMediaAccessRequestSchema,
  completeChatMediaUploadResponseSchema,
  completeProfileImageUploadResponseSchema,
  completeVerificationDocumentUploadResponseSchema,
  appNotificationListResponseSchema,
  appNotificationSchema,
  adminCatalogDeleteResponseSchema,
  adminCatalogItemInputSchema,
  adminCatalogItemSchema,
  adminCatalogKindSchema,
  adminCatalogListResponseSchema,
  adminConversationStartInputSchema,
  adminVerificationSnapshotSchema,
  conversationListResponseSchema,
  conversationMessageListResponseSchema,
  conversationMessageSchema,
  conversationMessageSendInputSchema,
  conversationSummarySchema,
  createAppNotificationInputSchema,
  deleteNotificationsResponseSchema,
  documentAccessRequestSchema,
  documentAccessResponseSchema,
  domainEventCatalog,
  externalUserIdSyncInputSchema,
  externalUserIdSyncResponseSchema,
  finalizeProfileImageUploadInputSchema,
  finalizeChatMediaUploadInputSchema,
  finalizeVerificationDocumentUploadInputSchema,
  gatewayAuthConfigurationSchema,
  initialV1RouteCatalog,
  jobListingCreateInputSchema,
  jobListingDetailSchema,
  jobListingListResponseSchema,
  jobListingUpdateInputSchema,
  onboardingSubmissionInputSchema,
  onboardingStatusSchema,
  platformMetadataSchema,
  clinicProfileUpdateInputSchema,
  professionalProfileListResponseSchema,
  professionalProfileSummarySchema,
  professionalProfileUpdateInputSchema,
  uploadDescriptorSchema,
  uploadRequestSchema,
  userPreferencesSchema,
  verificationReviewInputSchema,
  verificationStatusResponseSchema,
  markAllNotificationsReadResponseSchema,
  notificationCountResponseSchema,
  pushTokenDeleteInputSchema,
  pushTokenDeleteResponseSchema,
  pushTokenRegistrationInputSchema,
  pushTokenRegistrationResponseSchema,
  standardConversationStartInputSchema,
  type AuthPrincipal,
  type PlatformMetadata,
} from "@repo/contracts";
import {
  assertStoredObjectExists,
  buildStoredAssetUrl,
  createSignedDownloadUrl,
  createUploadDescriptor,
  getStorageConfig,
  isActorOwnedObjectKey,
} from "@repo/storage";
import { createAccessControl, startService } from "@repo/service-core";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const INTERNAL_SERVICE_TOKEN_HEADER = "x-internal-service-token";

function defaultDownstreamServiceUrl(serviceName: string, port: number) {
  const host =
    process.env.NODE_ENV === "production" ? serviceName : "127.0.0.1";
  return `http://${host}:${port}`;
}

const downstreamServices = {
  clinics:
    process.env.SERVICE_CLINICS_URL ??
    defaultDownstreamServiceUrl("clinics", 4113),
  identity:
    process.env.SERVICE_IDENTITY_URL ??
    defaultDownstreamServiceUrl("identity", 4111),
  notifications:
    process.env.SERVICE_NOTIFICATIONS_URL ??
    defaultDownstreamServiceUrl("notifications", 4115),
  messaging:
    process.env.SERVICE_MESSAGING_URL ??
    defaultDownstreamServiceUrl("messaging", 4116),
  profiles:
    process.env.SERVICE_PROFILES_URL ??
    defaultDownstreamServiceUrl("profiles", 4112),
  scheduling:
    process.env.SERVICE_SCHEDULING_URL ??
    defaultDownstreamServiceUrl("scheduling", 4114),
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
const notificationIdParamsSchema = z.object({
  notificationId: z.string().uuid(),
});
const externalUserIdParamsSchema = z.object({
  externalUserId: z.string().min(1),
});
const profileIdParamsSchema = z.object({
  profileId: z.string().min(1),
});
const clinicIdParamsSchema = z.object({
  clinicId: z.string().min(1),
});
const profileDirectoryFiltersSchema = z.object({
  city: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  specialty: z.string().min(1).optional(),
  verificationStatus: z
    .enum(["not_started", "pending_review", "approved", "rejected"])
    .optional(),
});
const clinicDirectoryFiltersSchema = z.object({
  city: z.string().min(1).optional(),
  facilityType: z.string().min(1).optional(),
  verificationStatus: z
    .enum(["not_started", "pending_review", "approved", "rejected"])
    .optional(),
});
const adminCatalogQuerySchema = z.object({
  kind: adminCatalogKindSchema.optional(),
  includeInactive: z.enum(["true", "false"]).optional(),
});
const adminCatalogParamsSchema = z.object({
  id: z.string().uuid(),
});
const conversationIdParamsSchema = z.object({
  conversationId: z.string().uuid(),
});

const auth = createAccessControl();

function toJsonSchema(schema: z.ZodTypeAny, name: string) {
  return zodToJsonSchema(schema, {
    name,
    target: "jsonSchema7",
    $refStrategy: "none",
  });
}

const authSignUpCompatInputSchema = z
  .object({
    displayName: z.string().min(1).optional(),
    email: z.string().email(),
    fullName: z.string().min(1).optional(),
    organizationName: z.string().min(1).optional(),
    password: z.string().min(8),
    profile: z
      .object({
        displayName: z.string().min(1).optional(),
        fullName: z.string().min(1).optional(),
        organizationName: z.string().min(1).optional(),
        type: z.string().min(1).optional(),
      })
      .passthrough()
      .optional(),
    role: z.string().min(1).optional(),
  })
  .passthrough();

function normalizeAuthSignUpInput(
  input: z.infer<typeof authSignUpCompatInputSchema>,
) {
  return {
    displayName:
      input.displayName ??
      input.profile?.displayName ??
      input.profile?.fullName ??
      input.profile?.organizationName ??
      input.fullName ??
      input.organizationName,
    email: input.email,
    password: input.password,
    role: input.role ?? input.profile?.type,
  };
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function extractRealmFromIssuer(issuer: string | undefined) {
  const match = issuer?.match(/\/realms\/([^/]+)\/?$/);
  return match?.[1];
}

function extractBaseUrlFromIssuer(
  issuer: string | undefined,
  realm: string | undefined,
) {
  if (!issuer || !realm) {
    return undefined;
  }

  return issuer.replace(new RegExp(`/realms/${realm}/?$`), "");
}

function getKeycloakOAuthConfig() {
  const issuer = process.env.AUTH_ISSUER_URL;
  const realm = process.env.AUTH_REALM ?? extractRealmFromIssuer(issuer);
  const baseUrl =
    process.env.KEYCLOAK_BASE_URL ??
    extractBaseUrlFromIssuer(issuer, realm ?? undefined);
  const publicClientId =
    process.env.KEYCLOAK_PUBLIC_CLIENT_ID ?? "syndeocare-web";

  if (!baseUrl || !realm || !publicClientId) {
    return null;
  }

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    publicClientId,
    realm,
  };
}

function resolveOAuthPublicClientId(
  requestedClientId: string | undefined,
  fallbackClientId: string,
) {
  if (!requestedClientId) return fallbackClientId;

  return requestedClientId === fallbackClientId ||
    requestedClientId === "syndeocare-web" ||
    requestedClientId === "syndeocare-mobile"
    ? requestedClientId
    : fallbackClientId;
}

function buildOAuthAuthorizationUrl(
  input: z.infer<typeof authOAuthStartInputSchema>,
) {
  const config = getKeycloakOAuthConfig();

  if (!config) {
    return null;
  }

  const authorizationUrl = new URL(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/auth`,
  );
  authorizationUrl.searchParams.set(
    "client_id",
    resolveOAuthPublicClientId(input.clientId, config.publicClientId),
  );
  authorizationUrl.searchParams.set("code_challenge", input.codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("kc_idp_hint", input.provider);
  authorizationUrl.searchParams.set("prompt", "select_account");
  authorizationUrl.searchParams.set("redirect_uri", input.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid profile email");
  authorizationUrl.searchParams.set("state", input.state);

  return authOAuthStartResponseSchema.parse({
    authorizationUrl: authorizationUrl.toString(),
    provider: input.provider,
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

function parseS3Uri(fileUrl: string) {
  if (!fileUrl.startsWith("s3://")) {
    return null;
  }

  const withoutScheme = fileUrl.slice("s3://".length);
  const slashIndex = withoutScheme.indexOf("/");

  if (slashIndex <= 0 || slashIndex === withoutScheme.length - 1) {
    return null;
  }

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    key: withoutScheme.slice(slashIndex + 1),
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

function mapSignInDownstreamStatusCode(
  statusCode: number,
): 400 | 401 | 403 | 503 {
  if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
    return statusCode;
  }

  return 503;
}

function mapSignUpDownstreamStatusCode(
  statusCode: number,
): 400 | 403 | 409 | 503 {
  if (statusCode === 400 || statusCode === 403 || statusCode === 409) {
    return statusCode;
  }

  return 503;
}

function mapRefreshDownstreamStatusCode(statusCode: number): 400 | 401 | 503 {
  if (statusCode === 400 || statusCode === 401) {
    return statusCode;
  }

  return 503;
}

function mapLogoutDownstreamStatusCode(statusCode: number): 400 | 401 | 503 {
  if (statusCode === 400 || statusCode === 401) {
    return statusCode;
  }

  return 503;
}

function mapOAuthDownstreamStatusCode(
  statusCode: number,
): 400 | 401 | 409 | 503 {
  if (statusCode === 400 || statusCode === 401 || statusCode === 409) {
    return statusCode;
  }

  return 503;
}

async function requestDownstreamResource<T>(
  serviceName: DownstreamServiceName,
  resourcePath: string,
  schema: z.ZodType<T>,
  options?: {
    headers?: Record<string, string>;
    method?: "DELETE" | "GET" | "PATCH" | "POST";
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
          ...(options?.headers ?? {}),
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
            403: toJsonSchema(
              apiErrorSchema,
              "ApiErrorEmailVerificationRequired",
            ),
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
          body: toJsonSchema(
            authSignUpCompatInputSchema,
            "AuthSignUpCompatInput",
          ),
          response: {
            200: toJsonSchema(authSessionSchema, "AuthSessionSignup"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationSignup"),
            403: toJsonSchema(
              apiErrorSchema,
              "ApiErrorEmailVerificationRequiredSignup",
            ),
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflictSignup"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableSignup",
            ),
          },
        },
      },
      async (request, reply) => {
        const compatBody = authSignUpCompatInputSchema.safeParse(request.body);

        if (!compatBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid email, password, role, and display name are required.",
          });
        }

        const parsedBody = authSignUpInputSchema.safeParse(
          normalizeAuthSignUpInput(compatBody.data),
        );

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

    app.post(
      "/v1/auth/oauth/google/start",
      {
        schema: {
          operationId: "startGoogleOAuth",
          summary: "Create a Google OAuth authorization URL",
          tags: ["auth"],
          body: toJsonSchema(authOAuthStartInputSchema, "AuthOAuthStartInput"),
          response: {
            200: toJsonSchema(
              authOAuthStartResponseSchema,
              "AuthOAuthStartResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorOAuthStartValidation"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorOAuthStartUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authOAuthStartInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const response = buildOAuthAuthorizationUrl(parsedBody.data);

        if (!response) {
          return reply.code(503).send({
            code: "AUTH_OAUTH_NOT_CONFIGURED",
            message:
              "Google authentication is not configured. Set KEYCLOAK_BASE_URL, KEYCLOAK_PUBLIC_CLIENT_ID, and AUTH_REALM for the API gateway.",
          });
        }

        return response;
      },
    );

    app.post(
      "/v1/auth/oauth/google/callback",
      {
        schema: {
          operationId: "completeGoogleOAuth",
          summary: "Exchange a Google OAuth callback for a platform session",
          tags: ["auth"],
          body: toJsonSchema(
            authOAuthCallbackInputSchema,
            "AuthOAuthCallbackInput",
          ),
          response: {
            200: toJsonSchema(authSessionSchema, "AuthOAuthSession"),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorOAuthCallbackValidation",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorOAuthUnauthorized"),
            409: toJsonSchema(apiErrorSchema, "ApiErrorOAuthRoleRequired"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorOAuthUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authOAuthCallbackInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/oauth/google/callback",
          authSessionSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapOAuthDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/refresh",
      {
        schema: {
          operationId: "refreshSession",
          summary: "Refresh a session using a refresh token",
          tags: ["auth"],
          body: toJsonSchema(authRefreshInputSchema, "AuthRefreshInput"),
          response: {
            200: toJsonSchema(authSessionSchema, "AuthSessionRefresh"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationRefresh"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorizedRefresh"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableRefresh",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authRefreshInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid refresh token is required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/refresh",
          authSessionSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapRefreshDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/logout",
      {
        schema: {
          operationId: "logoutSession",
          summary: "Revoke a refresh token and terminate the session",
          tags: ["auth"],
          body: toJsonSchema(authLogoutInputSchema, "AuthLogoutInput"),
          response: {
            200: toJsonSchema(authLogoutResponseSchema, "AuthLogoutResponse"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationLogout"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorizedLogout"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableLogout",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authLogoutInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid refresh token is required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/logout",
          authLogoutResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapLogoutDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/password-reset/request",
      {
        schema: {
          operationId: "requestPasswordReset",
          summary: "Send a password reset link to the account email",
          tags: ["auth"],
          body: toJsonSchema(
            authPasswordResetRequestInputSchema,
            "AuthPasswordResetRequestInput",
          ),
          response: {
            200: toJsonSchema(
              authEmailActionResponseSchema,
              "AuthEmailActionResponseReset",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationPasswordReset",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailablePasswordReset",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authPasswordResetRequestInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid email address and redirect URL are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/password-reset/request",
          authEmailActionResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
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
      "/v1/auth/password-reset/confirm",
      {
        schema: {
          operationId: "confirmPasswordReset",
          summary: "Complete a password reset using a signed reset token",
          tags: ["auth"],
          body: toJsonSchema(
            authPasswordResetConfirmInputSchema,
            "AuthPasswordResetConfirmInput",
          ),
          response: {
            200: toJsonSchema(
              authPasswordUpdateResponseSchema,
              "AuthPasswordUpdateResponseReset",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationPasswordResetConfirm",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedPasswordResetConfirm",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailablePasswordResetConfirm",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authPasswordResetConfirmInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid reset token and password are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/password-reset/confirm",
          authPasswordUpdateResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapRefreshDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/email-verification/request",
      {
        schema: {
          operationId: "requestEmailVerification",
          summary: "Send a verification link to the account email",
          tags: ["auth"],
          body: toJsonSchema(
            authEmailVerificationRequestInputSchema,
            "AuthEmailVerificationRequestInput",
          ),
          response: {
            200: toJsonSchema(
              authEmailActionResponseSchema,
              "AuthEmailActionResponseVerification",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationEmailVerificationRequest",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableEmailVerificationRequest",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authEmailVerificationRequestInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid email address and redirect URL are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/email-verification/request",
          authEmailActionResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
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
      "/v1/auth/email-verification/confirm",
      {
        schema: {
          operationId: "confirmEmailVerification",
          summary: "Confirm an email verification token",
          tags: ["auth"],
          body: toJsonSchema(
            authEmailVerificationConfirmInputSchema,
            "AuthEmailVerificationConfirmInput",
          ),
          response: {
            200: toJsonSchema(
              authEmailVerificationConfirmResponseSchema,
              "AuthEmailVerificationConfirmResponse",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationEmailVerificationConfirm",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedEmailVerificationConfirm",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableEmailVerificationConfirm",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authEmailVerificationConfirmInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid verification token is required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/email-verification/confirm",
          authEmailVerificationConfirmResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapRefreshDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/email-otp/request",
      {
        schema: {
          operationId: "requestEmailOtp",
          summary: "Send a six-digit email verification code",
          tags: ["auth"],
          body: toJsonSchema(
            authEmailOtpRequestInputSchema,
            "AuthEmailOtpRequestInput",
          ),
          response: {
            200: toJsonSchema(
              authEmailActionResponseSchema,
              "AuthEmailActionResponseOtp",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationEmailOtp"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorEmailOtpUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authEmailOtpRequestInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid email address is required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/email-otp/request",
          authEmailActionResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
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
      "/v1/auth/email-otp/confirm",
      {
        schema: {
          operationId: "confirmEmailOtp",
          summary: "Confirm a six-digit email verification code",
          tags: ["auth"],
          body: toJsonSchema(
            authEmailOtpConfirmInputSchema,
            "AuthEmailOtpConfirmInput",
          ),
          response: {
            200: toJsonSchema(
              authEmailVerificationConfirmResponseSchema,
              "AuthEmailOtpConfirmResponse",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationEmailOtpConfirm",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorizedEmailOtp"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorEmailOtpConfirmDownstream",
            ),
          },
        },
      },
      async (request, reply) => {
        const parsedBody = authEmailOtpConfirmInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid email address and six-digit code are required.",
          });
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/email-otp/confirm",
          authEmailVerificationConfirmResponseSchema,
          {
            body: parsedBody.data,
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapRefreshDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/auth/password",
      {
        schema: {
          operationId: "updateAuthenticatedPassword",
          summary: "Update the authenticated actor password",
          tags: ["auth"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            authPasswordUpdateInputSchema,
            "AuthPasswordUpdateInput",
          ),
          response: {
            200: toJsonSchema(
              authPasswordUpdateResponseSchema,
              "AuthPasswordUpdateResponse",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorValidationPasswordUpdate",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedPasswordUpdate",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailablePasswordUpdate",
            ),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const parsedBody = authPasswordUpdateInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid current password and new password are required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/password",
          authPasswordUpdateResponseSchema,
          {
            body: parsedBody.data,
            headers: {
              "x-auth-subject": actor.sub,
            },
            method: "POST",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(mapRefreshDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.delete(
      "/v1/auth/account",
      {
        schema: {
          operationId: "deleteAuthenticatedAccount",
          summary: "Delete the authenticated actor account",
          tags: ["auth"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              authAccountDeletionResponseSchema,
              "AuthAccountDeletionResponse",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedAccountDelete",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailableAccountDelete",
            ),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/auth/account",
          authAccountDeletionResponseSchema,
          {
            headers: {
              "x-auth-subject": actor.sub,
            },
            method: "DELETE",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(downstream.statusCode === 401 ? 401 : 503)
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/preferences/me",
      {
        schema: {
          operationId: "getAuthenticatedPreferences",
          summary: "Read the authenticated actor preferences",
          tags: ["preferences"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(userPreferencesSchema, "UserPreferences"),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedPreferences",
            ),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFoundPreferences"),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailablePreferences",
            ),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/preferences`,
          userPreferencesSchema,
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
      "/v1/preferences/me",
      {
        schema: {
          operationId: "updateAuthenticatedPreferences",
          summary: "Update the authenticated actor preferences",
          tags: ["preferences"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(userPreferencesSchema, "UserPreferencesUpdate"),
          response: {
            200: toJsonSchema(userPreferencesSchema, "UserPreferencesUpdated"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationPreferences"),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorUnauthorizedPreferencesPatch",
            ),
            404: toJsonSchema(
              apiErrorSchema,
              "ApiErrorNotFoundPreferencesPatch",
            ),
            503: toJsonSchema(
              apiErrorSchema,
              "ApiErrorServiceUnavailablePreferencesPatch",
            ),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const parsedBody = userPreferencesSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid preferences payload is required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/preferences`,
          userPreferencesSchema,
          {
            body: parsedBody.data,
            method: "PATCH",
          },
        );

        if (!downstream.ok) {
          return reply
            .code(
              downstream.statusCode === 400
                ? 400
                : mapDownstreamStatusCode(downstream.statusCode),
            )
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

    app.patch(
      "/v1/me/external-id",
      {
        schema: {
          operationId: "syncAuthenticatedActorExternalUserId",
          summary: "Sync the authenticated actor external user id",
          tags: ["auth"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            externalUserIdSyncInputSchema,
            "ExternalUserIdSyncInput",
          ),
          response: {
            200: toJsonSchema(
              externalUserIdSyncResponseSchema,
              "ExternalUserIdSyncResponse",
            ),
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
        const parsedBody = externalUserIdSyncInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/external-user-id`,
          externalUserIdSyncResponseSchema,
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
      "/v1/notifications",
      {
        schema: {
          operationId: "listNotifications",
          summary: "List notifications for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              appNotificationListResponseSchema,
              "AppNotificationListResponse",
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
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/notifications`,
          appNotificationListResponseSchema,
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
      "/v1/notifications",
      {
        schema: {
          operationId: "createNotification",
          summary:
            "Create an in-app notification for a target external user id",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            createAppNotificationInputSchema,
            "CreateAppNotificationInput",
          ),
          response: {
            200: toJsonSchema(appNotificationSchema, "AppNotification"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const parsedBody = createAppNotificationInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "notifications",
          "/internal/notifications",
          appNotificationSchema,
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

        return downstream.data;
      },
    );

    app.post(
      "/v1/notifications/push-tokens",
      {
        schema: {
          operationId: "registerPushNotificationToken",
          summary:
            "Register or refresh a push notification token for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            pushTokenRegistrationInputSchema,
            "PushTokenRegistrationInput",
          ),
          response: {
            200: toJsonSchema(
              pushTokenRegistrationResponseSchema,
              "PushTokenRegistrationResponse",
            ),
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
        const parsedBody = pushTokenRegistrationInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/push-tokens`,
          pushTokenRegistrationResponseSchema,
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

        return downstream.data;
      },
    );

    app.delete(
      "/v1/notifications/push-tokens",
      {
        schema: {
          operationId: "deletePushNotificationToken",
          summary:
            "Remove one or all push notification tokens for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            pushTokenDeleteInputSchema,
            "PushTokenDeleteInput",
          ),
          response: {
            200: toJsonSchema(
              pushTokenDeleteResponseSchema,
              "PushTokenDeleteResponse",
            ),
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
        const parsedBody = pushTokenDeleteInputSchema.safeParse(
          request.body ?? {},
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/push-tokens`,
          pushTokenDeleteResponseSchema,
          {
            method: "DELETE",
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
      "/v1/admin/notifications/:externalUserId/count",
      {
        schema: {
          operationId: "getAdminNotificationCount",
          summary: "Read notification count for a target external user id",
          tags: ["notifications", "admin"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["externalUserId"],
            properties: {
              externalUserId: { type: "string" },
            },
          },
          response: {
            200: toJsonSchema(
              notificationCountResponseSchema,
              "NotificationCountResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflict"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const parsedParams = externalUserIdParamsSchema.safeParse(
          request.params,
        );

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "notifications",
          `/internal/notifications/recipient/${encodeURIComponent(parsedParams.data.externalUserId)}/count`,
          notificationCountResponseSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(
              downstream.statusCode === 409
                ? 409
                : mapDownstreamStatusCode(downstream.statusCode),
            )
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.patch(
      "/v1/notifications/read-all",
      {
        schema: {
          operationId: "markAllNotificationsRead",
          summary: "Mark all notifications as read for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              markAllNotificationsReadResponseSchema,
              "MarkAllNotificationsReadResponse",
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
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/notifications/read-all`,
          markAllNotificationsReadResponseSchema,
          {
            method: "PATCH",
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
      "/v1/notifications/:notificationId/read",
      {
        schema: {
          operationId: "markNotificationRead",
          summary: "Mark one notification as read for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["notificationId"],
            properties: {
              notificationId: { type: "string", format: "uuid" },
            },
          },
          response: {
            200: toJsonSchema(appNotificationSchema, "AppNotification"),
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
        const parsedParams = notificationIdParamsSchema.safeParse(
          request.params,
        );

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/notifications/${encodeURIComponent(parsedParams.data.notificationId)}/read`,
          appNotificationSchema,
          {
            method: "PATCH",
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

    app.delete(
      "/v1/notifications/:notificationId",
      {
        schema: {
          operationId: "deleteNotification",
          summary: "Delete one notification for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["notificationId"],
            properties: {
              notificationId: { type: "string", format: "uuid" },
            },
          },
          response: {
            200: toJsonSchema(
              deleteNotificationsResponseSchema,
              "DeleteNotificationsResponse",
            ),
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
        const parsedParams = notificationIdParamsSchema.safeParse(
          request.params,
        );

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/notifications/${encodeURIComponent(parsedParams.data.notificationId)}`,
          deleteNotificationsResponseSchema,
          {
            method: "DELETE",
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

    app.delete(
      "/v1/notifications",
      {
        schema: {
          operationId: "deleteAllNotifications",
          summary: "Delete all notifications for the authenticated actor",
          tags: ["notifications"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              deleteNotificationsResponseSchema,
              "DeleteNotificationsResponse",
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
          "notifications",
          `/internal/actors/${encodeURIComponent(actor.sub)}/notifications`,
          deleteNotificationsResponseSchema,
          {
            method: "DELETE",
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
      "/v1/profiles",
      {
        schema: {
          operationId: "listProfessionalProfiles",
          summary: "Browse professional profiles",
          tags: ["profiles"],
          querystring: {
            type: "object",
            properties: {
              city: { type: "string" },
              language: { type: "string" },
              specialty: { type: "string" },
              verificationStatus: {
                type: "string",
                enum: ["not_started", "pending_review", "approved", "rejected"],
              },
            },
          },
          response: {
            200: toJsonSchema(
              professionalProfileListResponseSchema,
              "ProfessionalProfileListResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedQuery = profileDirectoryFiltersSchema.safeParse(
          request.query,
        );

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedQuery.error.issues));
        }

        const searchParams = new URLSearchParams();

        for (const [key, value] of Object.entries(parsedQuery.data)) {
          if (value) {
            searchParams.set(key, value);
          }
        }

        const downstream = await requestDownstreamResource(
          "profiles",
          `/internal/profiles${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
          professionalProfileListResponseSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(downstream.statusCode === 400 ? 400 : 503)
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/profiles/:profileId",
      {
        schema: {
          operationId: "getProfessionalProfileById",
          summary: "Get public professional profile details",
          tags: ["profiles"],
          params: {
            type: "object",
            required: ["profileId"],
            properties: {
              profileId: { type: "string" },
            },
          },
          response: {
            200: toJsonSchema(
              professionalProfileSummarySchema,
              "ProfessionalProfileSummaryPublic",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedParams = profileIdParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "profiles",
          `/internal/profiles/by-id/${encodeURIComponent(parsedParams.data.profileId)}`,
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
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflictClinic"),
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
            .code(
              downstream.statusCode === 409
                ? 409
                : mapDownstreamStatusCode(downstream.statusCode),
            )
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/clinics",
      {
        schema: {
          operationId: "listClinics",
          summary: "Browse clinic and facility profiles",
          tags: ["clinics"],
          querystring: {
            type: "object",
            properties: {
              city: { type: "string" },
              facilityType: { type: "string" },
              verificationStatus: {
                type: "string",
                enum: ["not_started", "pending_review", "approved", "rejected"],
              },
            },
          },
          response: {
            200: toJsonSchema(
              clinicProfileListResponseSchema,
              "ClinicProfileListResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedQuery = clinicDirectoryFiltersSchema.safeParse(
          request.query,
        );

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedQuery.error.issues));
        }

        const searchParams = new URLSearchParams();

        for (const [key, value] of Object.entries(parsedQuery.data)) {
          if (value) {
            searchParams.set(key, value);
          }
        }

        const downstream = await requestDownstreamResource(
          "clinics",
          `/internal/clinics${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
          clinicProfileListResponseSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(downstream.statusCode === 400 ? 400 : 503)
            .send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/clinics/:clinicId",
      {
        schema: {
          operationId: "getClinicById",
          summary: "Get public clinic profile details",
          tags: ["clinics"],
          params: {
            type: "object",
            required: ["clinicId"],
            properties: {
              clinicId: { type: "string" },
            },
          },
          response: {
            200: toJsonSchema(
              clinicProfileSummarySchema,
              "ClinicProfileSummaryPublic",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedParams = clinicIdParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "clinics",
          `/internal/clinics/by-id/${encodeURIComponent(parsedParams.data.clinicId)}`,
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

    app.get(
      "/v1/jobs/mine",
      {
        schema: {
          operationId: "listMyJobs",
          summary: "List shifts owned by the authenticated clinic",
          tags: ["jobs"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              jobListingListResponseSchema,
              "MyJobListingListResponse",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorizedMyJobs"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbiddenMyJobs"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFoundMyJobs"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailableMyJobs"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/jobs/owned/${encodeURIComponent(actor.sub)}`,
          jobListingListResponseSchema,
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

    app.get(
      "/v1/admin/verification",
      {
        schema: {
          operationId: "listAdminVerification",
          summary: "List verification actors and documents for admin review",
          tags: ["verification", "admin"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              adminVerificationSnapshotSchema,
              "AdminVerificationSnapshot",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/admin/verification",
          adminVerificationSnapshotSchema,
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
      "/v1/catalog",
      {
        schema: {
          operationId: "listActiveCatalog",
          summary: "List active platform catalog items",
          tags: ["catalog"],
          querystring: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: [
                  "certification",
                  "document_type",
                  "job_role",
                  "legal_page",
                  "specialty",
                ],
              },
            },
          },
          response: {
            200: toJsonSchema(
              adminCatalogListResponseSchema,
              "ActiveCatalogListResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorCatalogValidation"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
      },
      async (request, reply) => {
        const parsedQuery = z
          .object({ kind: adminCatalogKindSchema.optional() })
          .safeParse(request.query);

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedQuery.error.issues));
        }

        const params = new URLSearchParams();

        if (parsedQuery.data.kind) {
          params.set("kind", parsedQuery.data.kind);
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/admin/catalog${params.size > 0 ? `?${params.toString()}` : ""}`,
          adminCatalogListResponseSchema,
        );

        if (!downstream.ok) {
          return reply.code(503).send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.get(
      "/v1/admin/catalog",
      {
        schema: {
          operationId: "listAdminCatalog",
          summary: "List admin-managed platform catalog items",
          tags: ["admin", "catalog"],
          security: [{ bearerAuth: [] }],
          querystring: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: [
                  "certification",
                  "document_type",
                  "job_role",
                  "legal_page",
                  "specialty",
                ],
              },
              includeInactive: { type: "string", enum: ["true", "false"] },
            },
          },
          response: {
            200: toJsonSchema(
              adminCatalogListResponseSchema,
              "AdminCatalogListResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorCatalogValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const parsedQuery = adminCatalogQuerySchema.safeParse(request.query);

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedQuery.error.issues));
        }

        const params = new URLSearchParams();

        if (parsedQuery.data.kind) {
          params.set("kind", parsedQuery.data.kind);
        }

        if (parsedQuery.data.includeInactive) {
          params.set("includeInactive", parsedQuery.data.includeInactive);
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/admin/catalog${params.size > 0 ? `?${params.toString()}` : ""}`,
          adminCatalogListResponseSchema,
        );

        if (!downstream.ok) {
          return reply.code(503).send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/admin/catalog",
      {
        schema: {
          operationId: "saveAdminCatalogItem",
          summary: "Create or update an admin-managed platform catalog item",
          tags: ["admin", "catalog"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            adminCatalogItemInputSchema,
            "AdminCatalogItemInput",
          ),
          response: {
            200: toJsonSchema(adminCatalogItemSchema, "AdminCatalogItem"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorCatalogValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const parsedBody = adminCatalogItemInputSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "identity",
          "/internal/admin/catalog",
          adminCatalogItemSchema,
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

        return downstream.data;
      },
    );

    app.delete(
      "/v1/admin/catalog/:id",
      {
        schema: {
          operationId: "deleteAdminCatalogItem",
          summary: "Delete an admin-managed platform catalog item",
          tags: ["admin", "catalog"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["id"],
            properties: { id: { type: "string" } },
          },
          response: {
            200: toJsonSchema(
              adminCatalogDeleteResponseSchema,
              "AdminCatalogDeleteResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorCatalogValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const parsedParams = adminCatalogParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "identity",
          `/internal/admin/catalog/${encodeURIComponent(parsedParams.data.id)}`,
          adminCatalogDeleteResponseSchema,
          {
            method: "DELETE",
          },
        );

        if (!downstream.ok) {
          return reply.code(503).send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/admin/conversations",
      {
        schema: {
          operationId: "startAdminConversation",
          summary: "Start or open an admin conversation with a platform actor",
          tags: ["admin", "messages"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            adminConversationStartInputSchema,
            "AdminConversationStartInput",
          ),
          response: {
            200: toJsonSchema(conversationSummarySchema, "ConversationSummary"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorMessageValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["admin"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = adminConversationStartInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "messaging",
          `/internal/admin/conversations/${encodeURIComponent(actor.sub)}`,
          conversationSummarySchema,
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

        return downstream.data;
      },
    );

    app.get(
      "/v1/conversations",
      {
        schema: {
          operationId: "listConversations",
          summary: "List conversations visible to the authenticated actor",
          tags: ["messages"],
          security: [{ bearerAuth: [] }],
          response: {
            200: toJsonSchema(
              conversationListResponseSchema,
              "ConversationListResponse",
            ),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "messaging",
          `/internal/conversations/${encodeURIComponent(actor.sub)}`,
          conversationListResponseSchema,
        );

        if (!downstream.ok) {
          return reply.code(503).send(downstream.body);
        }

        return downstream.data;
      },
    );

    app.post(
      "/v1/conversations",
      {
        schema: {
          operationId: "startStandardConversation",
          summary:
            "Start or open a clinic-professional conversation for the authenticated actor",
          tags: ["messages"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            standardConversationStartInputSchema,
            "StandardConversationStartInput",
          ),
          response: {
            200: toJsonSchema(conversationSummarySchema, "ConversationSummary"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorMessageValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["professional", "clinic"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedBody = standardConversationStartInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "messaging",
          `/internal/conversations/${encodeURIComponent(actor.sub)}`,
          conversationSummarySchema,
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

        return downstream.data;
      },
    );

    app.get(
      "/v1/conversations/:conversationId/messages",
      {
        schema: {
          operationId: "listConversationMessages",
          summary: "List messages for a visible conversation",
          tags: ["messages"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["conversationId"],
            properties: { conversationId: { type: "string" } },
          },
          response: {
            200: toJsonSchema(
              conversationMessageListResponseSchema,
              "ConversationMessageListResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorMessageValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedParams = conversationIdParamsSchema.safeParse(
          request.params,
        );

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "messaging",
          `/internal/conversations/${encodeURIComponent(actor.sub)}/${encodeURIComponent(parsedParams.data.conversationId)}/messages`,
          conversationMessageListResponseSchema,
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
      "/v1/conversations/:conversationId/messages",
      {
        schema: {
          operationId: "sendConversationMessage",
          summary: "Send a message to a visible conversation",
          tags: ["messages"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["conversationId"],
            properties: { conversationId: { type: "string" } },
          },
          body: toJsonSchema(
            conversationMessageSendInputSchema,
            "ConversationMessageSendInput",
          ),
          response: {
            200: toJsonSchema(conversationMessageSchema, "ConversationMessage"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorMessageValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedParams = conversationIdParamsSchema.safeParse(
          request.params,
        );
        const parsedBody = conversationMessageSendInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "messaging",
          `/internal/conversations/${encodeURIComponent(actor.sub)}/${encodeURIComponent(parsedParams.data.conversationId)}/messages`,
          conversationMessageSchema,
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
            409: toJsonSchema(apiErrorSchema, "ApiErrorUploadDocumentLocked"),
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

        const currentOnboarding = await requestDownstreamResource(
          "identity",
          `/internal/actors/${encodeURIComponent(actor.sub)}/onboarding`,
          onboardingStatusSchema,
        );

        if (!currentOnboarding.ok) {
          return reply
            .code(mapDownstreamStatusCode(currentOnboarding.statusCode))
            .send(currentOnboarding.body);
        }

        const existingDocument = currentOnboarding.data.uploadedDocuments.find(
          (document) => document.documentType === parsedBody.data.documentType,
        );
        const canReplaceRejectedDocument =
          currentOnboarding.data.verificationStatus === "rejected" &&
          currentOnboarding.data.missingDocuments.includes(
            parsedBody.data.documentType,
          );

        if (existingDocument && !canReplaceRejectedDocument) {
          return reply.code(409).send({
            code: "DOCUMENT_REUPLOAD_LOCKED",
            message:
              "This document is already uploaded and can only be replaced after an admin rejects it.",
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

    app.post(
      "/v1/uploads/verification-document/access",
      {
        schema: {
          operationId: "createVerificationDocumentAccessUrl",
          summary:
            "Create a signed access URL for a private verification document",
          tags: ["uploads", "onboarding"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            documentAccessRequestSchema,
            "DocumentAccessRequest",
          ),
          response: {
            200: toJsonSchema(
              documentAccessResponseSchema,
              "DocumentAccessResponse",
            ),
            400: toJsonSchema(
              apiErrorSchema,
              "ApiErrorDocumentAccessValidation",
            ),
            401: toJsonSchema(
              apiErrorSchema,
              "ApiErrorDocumentAccessUnauthorized",
            ),
            403: toJsonSchema(
              apiErrorSchema,
              "ApiErrorDocumentAccessForbidden",
            ),
          },
        },
        preHandler: auth.requireAccess({
          roles: ["admin", "clinic", "professional"],
        }),
      },
      async (request, reply) => {
        const parsedBody = documentAccessRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const parsedFile = parseS3Uri(parsedBody.data.fileUrl);

        if (!parsedFile) {
          return reply.code(400).send({
            code: "DOCUMENT_URL_INVALID",
            message: "A valid s3:// document URL is required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;

        if (
          actor.role !== "admin" &&
          !isActorOwnedObjectKey({
            actorRole: actor.role,
            actorSubject: actor.sub,
            key: parsedFile.key,
          })
        ) {
          return reply.code(403).send({
            code: "DOCUMENT_ACCESS_FORBIDDEN",
            message:
              "You are not allowed to access a private document that does not belong to your actor account.",
          });
        }

        return {
          signedUrl: await createSignedDownloadUrl(parsedFile),
        };
      },
    );

    app.post(
      "/v1/uploads/chat-media",
      {
        schema: {
          operationId: "createChatMediaUpload",
          summary: "Create a presigned upload URL for conversation media",
          tags: ["uploads", "messages"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(uploadRequestSchema, "UploadRequestChatMedia"),
          response: {
            200: toJsonSchema(uploadDescriptorSchema, "UploadDescriptorChat"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorUploadChatValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUploadChatUnauthorized"),
          },
        },
        preHandler: auth.requireAccess({
          roles: ["admin", "clinic", "professional"],
        }),
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
          assetType: "chat-media",
          contentType: parsedBody.data.contentType,
          fileName: parsedBody.data.fileName,
        });
      },
    );

    app.post(
      "/v1/uploads/chat-media/complete",
      {
        schema: {
          operationId: "completeChatMediaUpload",
          summary: "Verify an uploaded conversation attachment",
          tags: ["uploads", "messages"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            finalizeChatMediaUploadInputSchema,
            "FinalizeChatMediaUploadInput",
          ),
          response: {
            200: toJsonSchema(
              completeChatMediaUploadResponseSchema,
              "CompleteChatMediaUploadResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorUploadChatFinalize"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUploadChatUnauthorized"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorUploadChatNotFound"),
          },
        },
        preHandler: auth.requireAccess({
          roles: ["admin", "clinic", "professional"],
        }),
      },
      async (request, reply) => {
        const parsedBody = finalizeChatMediaUploadInputSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid uploaded chat media payload is required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;

        if (parsedBody.data.bucket !== storageConfig.privateBucket) {
          return reply.code(400).send({
            code: "UPLOAD_BUCKET_INVALID",
            message:
              "Chat attachments must be stored in the private document bucket.",
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
            message: "The uploaded chat attachment could not be found.",
          });
        }

        return {
          persisted: true,
          assetType: "chat-media",
          resource: "conversation-message",
          fileUrl: `s3://${parsedBody.data.bucket}/${parsedBody.data.key}`,
        };
      },
    );

    app.post(
      "/v1/uploads/chat-media/access",
      {
        schema: {
          operationId: "createChatMediaAccessUrl",
          summary: "Create a signed access URL for private conversation media",
          tags: ["uploads", "messages"],
          security: [{ bearerAuth: [] }],
          body: toJsonSchema(
            chatMediaAccessRequestSchema,
            "ChatMediaAccessRequest",
          ),
          response: {
            200: toJsonSchema(
              documentAccessResponseSchema,
              "ChatMediaAccessResponse",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorChatMediaAccess"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorChatMediaUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorChatMediaForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorChatMediaNotFound"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorChatMediaUnavailable"),
          },
        },
        preHandler: auth.requireAccess({
          roles: ["admin", "clinic", "professional"],
        }),
      },
      async (request, reply) => {
        const parsedBody = chatMediaAccessRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const parsedFile = parseS3Uri(parsedBody.data.fileUrl);

        if (!parsedFile) {
          return reply.code(400).send({
            code: "CHAT_MEDIA_URL_INVALID",
            message: "A valid s3:// chat media URL is required.",
          });
        }

        const actor = request.authContext as AuthPrincipal;
        const downstream = await requestDownstreamResource(
          "messaging",
          `/internal/conversations/${encodeURIComponent(actor.sub)}/${encodeURIComponent(parsedBody.data.conversationId)}/messages`,
          conversationMessageListResponseSchema,
        );

        if (!downstream.ok) {
          return reply
            .code(mapDownstreamStatusCode(downstream.statusCode))
            .send(downstream.body);
        }

        const canAccessFile = downstream.data.items.some(
          (message) => message.fileUrl === parsedBody.data.fileUrl,
        );

        if (!canAccessFile) {
          return reply.code(403).send({
            code: "CHAT_MEDIA_ACCESS_FORBIDDEN",
            message:
              "You are not allowed to access this conversation attachment.",
          });
        }

        try {
          return {
            signedUrl: await createSignedDownloadUrl(parsedFile),
          };
        } catch {
          return reply.code(404).send({
            code: "CHAT_MEDIA_OBJECT_NOT_FOUND",
            message: "The requested chat attachment could not be found.",
          });
        }
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

    app.patch(
      "/v1/jobs/:jobId",
      {
        schema: {
          operationId: "updateJob",
          summary: "Update a shift owned by the authenticated clinic",
          tags: ["jobs"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["jobId"],
            properties: {
              jobId: { type: "string" },
            },
          },
          body: toJsonSchema(
            jobListingUpdateInputSchema,
            "JobListingUpdateInput",
          ),
          response: {
            200: toJsonSchema(
              jobListingDetailSchema,
              "UpdatedJobListingDetail",
            ),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidationUpdateJob"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorizedUpdateJob"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbiddenUpdateJob"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFoundUpdateJob"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailableUpdateJob"),
          },
        },
        preHandler: auth.requireAccess({ roles: ["clinic"] }),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedParams = jobIdParamsSchema.safeParse(request.params);
        const parsedBody = jobListingUpdateInputSchema.safeParse(request.body);

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/jobs/${encodeURIComponent(actor.sub)}/${encodeURIComponent(parsedParams.data.jobId)}`,
          jobListingDetailSchema,
          {
            body: parsedBody.data,
            method: "PATCH",
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

    app.patch(
      "/v1/bookings/:bookingId",
      {
        schema: {
          operationId: "updateBookingStatus",
          summary: "Update a booking status visible to the authenticated actor",
          tags: ["bookings"],
          security: [{ bearerAuth: [] }],
          params: {
            type: "object",
            required: ["bookingId"],
            properties: {
              bookingId: { type: "string" },
            },
          },
          body: toJsonSchema(
            bookingStatusUpdateInputSchema,
            "BookingStatusUpdateInput",
          ),
          response: {
            200: toJsonSchema(bookingDetailSchema, "UpdatedBookingDetail"),
            400: toJsonSchema(apiErrorSchema, "ApiErrorValidation"),
            401: toJsonSchema(apiErrorSchema, "ApiErrorUnauthorized"),
            403: toJsonSchema(apiErrorSchema, "ApiErrorForbidden"),
            404: toJsonSchema(apiErrorSchema, "ApiErrorNotFound"),
            409: toJsonSchema(apiErrorSchema, "ApiErrorConflict"),
            503: toJsonSchema(apiErrorSchema, "ApiErrorUnavailable"),
          },
        },
        preHandler: auth.requireAccess(),
      },
      async (request, reply) => {
        const actor = request.authContext as AuthPrincipal;
        const parsedParams = bookingIdParamsSchema.safeParse(request.params);
        const parsedBody = bookingStatusUpdateInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedParams.error.issues));
        }

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(buildValidationError(parsedBody.error.issues));
        }

        const downstream = await requestDownstreamResource(
          "scheduling",
          `/internal/bookings/${encodeURIComponent(actor.sub)}/${encodeURIComponent(parsedParams.data.bookingId)}`,
          bookingDetailSchema,
          {
            body: parsedBody.data,
            method: "PATCH",
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
  },
});
