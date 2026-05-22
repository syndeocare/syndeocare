import {
  authPrincipalSchema,
  authSessionSchema,
  authSignInInputSchema,
  authSignUpInputSchema,
  domainEventCatalog,
  notificationDeliveryResponseSchema,
  notificationEmailRequestSchema,
} from "@repo/contracts";
import {
  ensureActorAccount,
  getAuthPrincipalBySubject,
  getOnboardingStatusBySubject,
  getVerificationStatusBySubject,
  reviewVerificationBySubject,
  updateOnboardingBySubject,
} from "@repo/persistence";
import {
  buildAuthPrincipalFromAccessToken,
  decodeAccessToken,
  startService,
} from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const onboardingSubmissionInputSchema = z.object({
  requiredDocuments: z.array(z.string().min(1)),
  missingDocuments: z.array(z.string().min(1)),
  nextAction: z.string().min(1),
  submitForReview: z.boolean().default(false),
});
const verificationReviewInputSchema = z.object({
  status: z.enum(["pending_review", "approved", "rejected"]),
  outstandingDocuments: z.array(z.string().min(1)),
  nextAction: z.string().min(1),
  rejectionReason: z.string().min(1).optional(),
});

const keycloakAdminResponseSchema = z.object({
  access_token: z.string().min(1),
});
const keycloakTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_expires_in: z.number().int().positive().optional(),
  scope: z.string().min(1).optional(),
});

function getKeycloakConfig() {
  return {
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
    adminRealm: process.env.KEYCLOAK_ADMIN_REALM ?? "master",
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? "admin",
    apiClientId: process.env.AUTH_CLIENT_ID ?? "syndeocare-api",
    baseUrl: process.env.KEYCLOAK_BASE_URL ?? "http://127.0.0.1:8180",
    publicClientId: process.env.KEYCLOAK_PUBLIC_CLIENT_ID ?? "syndeocare-web",
    realm: process.env.KEYCLOAK_REALM ?? process.env.AUTH_REALM ?? "syndeocare",
  };
}

function getNotificationsServiceUrl() {
  return process.env.SERVICE_NOTIFICATIONS_URL ?? "http://127.0.0.1:4115";
}

function mapTokenSet(payload: z.infer<typeof keycloakTokenResponseSchema>) {
  return {
    accessToken: payload.access_token,
    refreshExpiresIn: payload.refresh_expires_in,
    refreshToken: payload.refresh_token,
    scope: payload.scope,
    tokenType: payload.token_type,
    expiresIn: payload.expires_in,
  };
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts.shift() ?? displayName;
  return {
    firstName,
    lastName: parts.join(" "),
  };
}

async function requestKeycloakForm(
  url: string,
  body: URLSearchParams,
  headers?: Record<string, string>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body,
  });

  const payload = (await response.json().catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;

  return { response, payload };
}

async function getAdminAccessToken() {
  const config = getKeycloakConfig();
  const { payload, response } = await requestKeycloakForm(
    `${config.baseUrl}/realms/${config.adminRealm}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: "admin-cli",
      grant_type: "password",
      password: config.adminPassword,
      username: config.adminUsername,
    }),
  );

  if (!response.ok) {
    throw new Error("Keycloak admin authentication failed.");
  }

  return keycloakAdminResponseSchema.parse(payload).access_token;
}

async function assignRealmRole(
  adminAccessToken: string,
  userId: string,
  role: z.infer<typeof authSignUpInputSchema>["role"],
) {
  const config = getKeycloakConfig();
  const roleResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/roles/${role}`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!roleResponse.ok) {
    throw new Error(`Keycloak role lookup failed for role ${role}.`);
  }

  const roleRepresentation = (await roleResponse.json()) as Record<
    string,
    unknown
  >;

  const mappingResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${userId}/role-mappings/realm`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([roleRepresentation]),
    },
  );

  if (!mappingResponse.ok) {
    throw new Error(`Keycloak role assignment failed for role ${role}.`);
  }
}

async function createKeycloakUser(
  input: z.infer<typeof authSignUpInputSchema>,
) {
  const config = getKeycloakConfig();
  const adminAccessToken = await getAdminAccessToken();
  const { firstName, lastName } = splitDisplayName(input.displayName);
  const createResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        enabled: true,
        emailVerified: true,
        firstName,
        lastName: lastName.length > 0 ? lastName : undefined,
        credentials: [
          {
            type: "password",
            value: input.password,
            temporary: false,
          },
        ],
      }),
    },
  );

  if (createResponse.status === 409) {
    return {
      code: "AUTH_ACCOUNT_EXISTS",
      ok: false as const,
      statusCode: 409,
    };
  }

  if (!createResponse.ok) {
    return {
      code: "AUTH_SIGNUP_FAILED",
      ok: false as const,
      statusCode: 503,
    };
  }

  const location = createResponse.headers.get("location");
  const userId = location?.split("/").pop();

  if (!userId) {
    return {
      code: "AUTH_SIGNUP_FAILED",
      ok: false as const,
      statusCode: 503,
    };
  }

  await assignRealmRole(adminAccessToken, userId, input.role);

  return {
    ok: true as const,
    userId,
  };
}

async function exchangePasswordForSession(
  input: z.infer<typeof authSignInInputSchema>,
  fallbackRole?: z.infer<typeof authSignUpInputSchema>["role"],
) {
  const config = getKeycloakConfig();
  const { payload, response } = await requestKeycloakForm(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: config.publicClientId,
      grant_type: "password",
      password: input.password,
      scope: "openid profile email",
      username: input.email,
    }),
  );

  if (response.status === 401 || response.status === 400) {
    return {
      ok: false as const,
      statusCode: 401,
      body: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      statusCode: 503,
      body: {
        code: "AUTH_PROVIDER_UNAVAILABLE",
        message: "Keycloak is unavailable. Check the local auth stack.",
      },
    };
  }

  const tokens = keycloakTokenResponseSchema.parse(payload);
  const decodedToken = decodeAccessToken(tokens.access_token);
  let principal: z.infer<typeof authPrincipalSchema> | undefined =
    buildAuthPrincipalFromAccessToken(tokens.access_token, config.apiClientId);

  if (!principal && decodedToken?.sub) {
    const existingActor = await getAuthPrincipalBySubject(decodedToken.sub);
    principal = existingActor ?? undefined;
  }

  if (!principal && decodedToken?.sub && fallbackRole) {
    principal = authPrincipalSchema.parse({
      sub: decodedToken.sub,
      email:
        typeof decodedToken.email === "string" ? decodedToken.email : undefined,
      role: fallbackRole,
      permissions: [],
      onboardingCompleted: false,
      verificationStatus: "not_started",
      displayName:
        typeof decodedToken.name === "string"
          ? decodedToken.name
          : typeof decodedToken.preferred_username === "string"
            ? decodedToken.preferred_username
            : undefined,
    });
  }

  if (!principal) {
    return {
      ok: false as const,
      statusCode: 503,
      body: {
        code: "AUTH_TOKEN_INVALID",
        message:
          "Keycloak returned a token that could not be mapped to a platform actor.",
      },
    };
  }

  const persistedPrincipal = await ensureActorAccount({
    subject: principal.sub,
    email: principal.email,
    displayName: principal.displayName,
    role: principal.role,
  });

  return {
    ok: true as const,
    data: authSessionSchema.parse({
      isNewUser: false,
      principal: persistedPrincipal,
      tokens: mapTokenSet(tokens),
    }),
  };
}

async function sendWelcomeNotification(
  session: z.infer<typeof authSessionSchema>,
) {
  const recipientEmail = session.principal.email;

  if (!recipientEmail) {
    throw new Error("A welcome email requires an authenticated email address.");
  }

  const requestBody = notificationEmailRequestSchema.parse({
    actorSubject: session.principal.sub,
    html: `
      <div>
        <h1>Welcome to Syndeocare</h1>
        <p>Hi ${session.principal.displayName ?? "there"}, your ${
          session.principal.role
        } account is ready.</p>
        <p>Complete onboarding in the app and upload the required documents to activate your workflow.</p>
      </div>
    `,
    subject: "Welcome to Syndeocare",
    toEmail: recipientEmail,
  });

  const response = await fetch(
    new URL(
      "/internal/notifications/email",
      `${getNotificationsServiceUrl()}/`,
    ),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.INTERNAL_SERVICE_TOKEN
          ? {
              "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN,
            }
          : {}),
      },
      body: JSON.stringify(requestBody),
    },
  );
  const payload = (await response.json().catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "The notifications service could not send the welcome email.",
    );
  }

  notificationDeliveryResponseSchema.parse(payload);
}

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

    app.post("/internal/auth/signin", async (request, reply) => {
      const parsedBody = authSignInInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid email and password are required.",
        });
      }

      const session = await exchangePasswordForSession(parsedBody.data);

      if (!session.ok) {
        return reply.code(session.statusCode).send(session.body);
      }

      return session.data;
    });

    app.post("/internal/auth/signup", async (request, reply) => {
      const parsedBody = authSignUpInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message:
            "A valid email, password, role, and display name are required.",
        });
      }

      const created = await createKeycloakUser(parsedBody.data);

      if (!created.ok) {
        return reply.code(created.statusCode).send({
          code: created.code,
          message:
            created.statusCode === 409
              ? "An account already exists for this email address."
              : "Keycloak could not create the account.",
        });
      }

      const session = await exchangePasswordForSession(
        {
          email: parsedBody.data.email,
          password: parsedBody.data.password,
        },
        parsedBody.data.role,
      );

      if (!session.ok) {
        return reply.code(session.statusCode).send(session.body);
      }

      await sendWelcomeNotification(session.data);

      return authSessionSchema.parse({
        ...session.data,
        isNewUser: true,
      });
    });

    app.patch(
      "/internal/actors/:subject/onboarding",
      async (request, reply) => {
        const parsedSubject = subjectParamsSchema.safeParse(request.params);
        const parsedBody = onboardingSubmissionInputSchema.safeParse(
          request.body,
        );

        if (!parsedSubject.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid subject and onboarding payload are required.",
          });
        }

        const onboardingStatus = await updateOnboardingBySubject(
          parsedSubject.data.subject,
          parsedBody.data,
        );

        if (!onboardingStatus) {
          return reply.code(404).send({
            code: "ONBOARDING_NOT_FOUND",
            message: "No actor was found for the provided auth subject.",
          });
        }

        return onboardingStatus;
      },
    );

    app.patch(
      "/internal/actors/:subject/verification",
      async (request, reply) => {
        const parsedSubject = subjectParamsSchema.safeParse(request.params);
        const parsedBody = verificationReviewInputSchema.safeParse(
          request.body,
        );

        if (!parsedSubject.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid subject and verification review payload are required.",
          });
        }

        const verificationStatus = await reviewVerificationBySubject(
          parsedSubject.data.subject,
          parsedBody.data,
        );

        if (!verificationStatus) {
          return reply.code(404).send({
            code: "VERIFICATION_NOT_FOUND",
            message: "No actor was found for the provided auth subject.",
          });
        }

        return verificationStatus;
      },
    );
  },
});
