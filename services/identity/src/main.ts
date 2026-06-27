import {
  authAccountDeletionResponseSchema,
  authEmailActionResponseSchema,
  authEmailOtpConfirmInputSchema,
  authEmailOtpRequestInputSchema,
  authEmailVerificationConfirmInputSchema,
  authEmailVerificationConfirmResponseSchema,
  authEmailVerificationRequestInputSchema,
  authLogoutInputSchema,
  authLogoutResponseSchema,
  authOAuthCallbackInputSchema,
  authPasswordResetConfirmInputSchema,
  authPasswordResetRequestInputSchema,
  authPasswordUpdateInputSchema,
  authPasswordUpdateResponseSchema,
  authPrincipalSchema,
  authRefreshInputSchema,
  authSessionSchema,
  authSignInInputSchema,
  authSignUpInputSchema,
  adminCatalogItemInputSchema,
  adminCatalogKindSchema,
  adminCatalogListResponseSchema,
  adminCatalogItemSchema,
  adminCatalogDeleteResponseSchema,
  domainEventCatalog,
  externalUserIdSyncInputSchema,
  externalUserIdSyncResponseSchema,
  adminVerificationSnapshotSchema,
  notificationDeliveryResponseSchema,
  notificationEmailRequestSchema,
  userPreferencesSchema,
} from "@repo/contracts";
import {
  deleteActorBySubject,
  ensureActorAccount,
  getAuthPrincipalBySubject,
  deleteAdminCatalogItem,
  listAdminCatalogItems,
  listAdminVerificationSnapshot,
  getOnboardingStatusBySubject,
  getUserPreferencesBySubject,
  getVerificationStatusBySubject,
  persistVerificationDocumentBySubject,
  reviewVerificationBySubject,
  saveAdminCatalogItem,
  syncActorExternalUserIdBySubject,
  updateOnboardingBySubject,
  updateUserPreferencesBySubject,
} from "@repo/persistence";
import {
  buildAuthPrincipalFromAccessToken,
  decodeAccessToken,
  publishDomainEvent,
  startService,
} from "@repo/service-core";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const adminCatalogQuerySchema = z.object({
  kind: adminCatalogKindSchema.optional(),
  includeInactive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
});
const adminCatalogParamsSchema = z.object({
  id: z.string().uuid(),
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
const finalizeVerificationDocumentInputSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  documentType: z.string().min(1),
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
const keycloakUserRepresentationSchema = z.object({
  email: z.string().email().optional(),
  emailVerified: z.boolean().optional(),
  enabled: z.boolean().optional(),
  firstName: z.string().optional(),
  id: z.string().min(1),
  lastName: z.string().optional(),
  username: z.string().optional(),
});
const keycloakFederatedIdentitySchema = z.object({
  identityProvider: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().optional(),
});
const keycloakUserInfoSchema = z.object({
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  sub: z.string().min(1),
});
const authEmailActionTokenSchema = z.object({
  action: z.enum(["verify-email", "reset-password"]),
  email: z.string().email(),
  exp: z.number().int().positive(),
  sub: z.string().min(1),
});

const EMAIL_OTP_TTL_SECONDS = 10 * 60;

class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("The current password is incorrect.");
  }
}

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
  const defaultHost =
    process.env.NODE_ENV === "production" ? "notifications" : "127.0.0.1";
  return process.env.SERVICE_NOTIFICATIONS_URL ?? `http://${defaultHost}:4115`;
}

function getAuthEmailTokenSecret() {
  return (
    process.env.AUTH_EMAIL_TOKEN_SECRET ??
    process.env.INTERNAL_SERVICE_TOKEN ??
    "development-auth-email-secret"
  );
}

function isEmailVerificationRequired() {
  return process.env.AUTH_EMAIL_VERIFICATION_REQUIRED === "true";
}

function getGoogleIdentityProviderConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
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

interface KeycloakAuthenticationExecution {
  id: string;
  providerId?: string;
  displayName?: string;
  requirement?: string;
  index?: number;
  level?: number;
}

async function getKeycloakAuthenticationExecutions(
  adminAccessToken: string,
  flowAlias: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/flows/${encodeURIComponent(flowAlias)}/executions`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Keycloak authentication flow ${flowAlias} lookup failed.`);
  }

  return (await response.json()) as KeycloakAuthenticationExecution[];
}

async function ensureKeycloakAuthenticationFlowCopy(
  adminAccessToken: string,
  sourceFlowAlias: string,
  targetFlowAlias: string,
) {
  const config = getKeycloakConfig();
  const flowsResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/flows`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!flowsResponse.ok) {
    throw new Error("Keycloak authentication flows lookup failed.");
  }

  const flows = (await flowsResponse.json()) as Array<{ alias?: string }>;

  if (flows.some((flow) => flow.alias === targetFlowAlias)) {
    return;
  }

  const copyResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/flows/${encodeURIComponent(sourceFlowAlias)}/copy`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ newName: targetFlowAlias }),
    },
  );

  if (!copyResponse.ok && copyResponse.status !== 409) {
    throw new Error("Keycloak first broker login flow copy failed.");
  }
}

async function addKeycloakAuthenticationExecution(
  adminAccessToken: string,
  flowAlias: string,
  provider: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/flows/${encodeURIComponent(flowAlias)}/executions/execution`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ provider }),
    },
  );

  if (!response.ok && response.status !== 409) {
    throw new Error(
      `Keycloak authentication execution ${provider} could not be added.`,
    );
  }
}

async function ensureKeycloakAuthenticationSubflow(
  adminAccessToken: string,
  parentFlowAlias: string,
  subflowAlias: string,
) {
  let executions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    parentFlowAlias,
  );
  let subflow = executions.find(
    (execution) => execution.displayName === subflowAlias,
  );

  if (!subflow) {
    const config = getKeycloakConfig();
    const response = await fetch(
      `${config.baseUrl}/admin/realms/${config.realm}/authentication/flows/${encodeURIComponent(parentFlowAlias)}/executions/flow`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminAccessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          alias: subflowAlias,
          provider: "basic-flow",
          type: "basic-flow",
        }),
      },
    );

    if (!response.ok && response.status !== 409) {
      throw new Error(
        `Keycloak authentication subflow ${subflowAlias} could not be added.`,
      );
    }

    executions = await getKeycloakAuthenticationExecutions(
      adminAccessToken,
      parentFlowAlias,
    );
    subflow = executions.find(
      (execution) => execution.displayName === subflowAlias,
    );
  }

  if (!subflow) {
    throw new Error(
      `Keycloak authentication subflow ${subflowAlias} is unavailable.`,
    );
  }

  return subflow;
}

async function updateKeycloakAuthenticationExecutionRequirement(
  adminAccessToken: string,
  flowAlias: string,
  execution: KeycloakAuthenticationExecution,
  requirement: "ALTERNATIVE" | "DISABLED" | "REQUIRED",
) {
  if (execution.requirement === requirement) {
    return;
  }

  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/flows/${encodeURIComponent(flowAlias)}/executions`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ...execution, requirement }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Keycloak authentication execution ${execution.providerId ?? execution.displayName ?? execution.id} could not be updated.`,
    );
  }
}

async function raiseKeycloakAuthenticationExecutionPriority(
  adminAccessToken: string,
  execution: KeycloakAuthenticationExecution,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/executions/${encodeURIComponent(execution.id)}/raise-priority`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Keycloak authentication execution ${execution.providerId ?? execution.id} priority could not be updated.`,
    );
  }
}

async function ensureKeycloakRequiredActionDisabled(
  adminAccessToken: string,
  alias: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/required-actions/${encodeURIComponent(alias)}`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new Error(`Keycloak required action ${alias} lookup failed.`);
  }

  const requiredAction = (await response.json()) as {
    defaultAction?: boolean;
    enabled?: boolean;
  };

  if (
    requiredAction.enabled === false &&
    requiredAction.defaultAction === false
  ) {
    return;
  }

  const updateResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/authentication/required-actions/${encodeURIComponent(alias)}`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...requiredAction,
        defaultAction: false,
        enabled: false,
      }),
    },
  );

  if (!updateResponse.ok) {
    throw new Error(`Keycloak required action ${alias} could not be disabled.`);
  }
}

async function ensureKeycloakProfileNamesOptional(adminAccessToken: string) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/profile`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new Error("Keycloak user profile lookup failed.");
  }

  const userProfile = (await response.json()) as {
    attributes?: Array<{ name?: string; required?: unknown }>;
  };
  let changed = false;

  for (const attribute of userProfile.attributes ?? []) {
    if (
      (attribute.name === "firstName" || attribute.name === "lastName") &&
      attribute.required !== undefined
    ) {
      delete attribute.required;
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  const updateResponse = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/profile`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(userProfile),
    },
  );

  if (!updateResponse.ok) {
    throw new Error("Keycloak user profile could not be updated.");
  }
}

async function ensureKeycloakFirstBrokerAutoLink(adminAccessToken: string) {
  const builtInFirstBrokerFlowAlias = "first broker login";
  const firstBrokerFlowAlias = "syndeocare first broker login";
  const userCreationFlowAlias = `${firstBrokerFlowAlias} User creation or linking`;
  const autoLinkSubflowAlias = `${firstBrokerFlowAlias} Existing account auto link`;

  await ensureKeycloakAuthenticationFlowCopy(
    adminAccessToken,
    builtInFirstBrokerFlowAlias,
    firstBrokerFlowAlias,
  );
  await ensureKeycloakRequiredActionDisabled(
    adminAccessToken,
    "VERIFY_PROFILE",
  );
  await ensureKeycloakProfileNamesOptional(adminAccessToken);

  const firstBrokerExecutions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    firstBrokerFlowAlias,
  );
  const firstBrokerExecutionsToDisable = firstBrokerExecutions.filter(
    (execution) =>
      execution.providerId === "idp-review-profile" ||
      execution.providerId === "idp-confirm-link" ||
      execution.providerId === "idp-email-verification" ||
      execution.displayName?.toLowerCase().includes("review profile") ||
      execution.displayName?.toLowerCase().includes("confirm link") ||
      execution.displayName?.toLowerCase().includes("verify existing") ||
      execution.displayName
        ?.toLowerCase()
        .includes("update account information"),
  );

  for (const execution of firstBrokerExecutionsToDisable) {
    await updateKeycloakAuthenticationExecutionRequirement(
      adminAccessToken,
      firstBrokerFlowAlias,
      execution,
      "DISABLED",
    );
  }

  let userCreationExecutions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    userCreationFlowAlias,
  );
  let autoLinkSubflow = await ensureKeycloakAuthenticationSubflow(
    adminAccessToken,
    userCreationFlowAlias,
    autoLinkSubflowAlias,
  );
  await updateKeycloakAuthenticationExecutionRequirement(
    adminAccessToken,
    userCreationFlowAlias,
    autoLinkSubflow,
    "ALTERNATIVE",
  );

  let autoLinkSubflowExecutions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    autoLinkSubflowAlias,
  );
  let detectExistingExecution = autoLinkSubflowExecutions.find(
    (execution) => execution.providerId === "idp-detect-existing-broker-user",
  );

  if (!detectExistingExecution) {
    await addKeycloakAuthenticationExecution(
      adminAccessToken,
      autoLinkSubflowAlias,
      "idp-detect-existing-broker-user",
    );
    autoLinkSubflowExecutions = await getKeycloakAuthenticationExecutions(
      adminAccessToken,
      autoLinkSubflowAlias,
    );
    detectExistingExecution = autoLinkSubflowExecutions.find(
      (execution) => execution.providerId === "idp-detect-existing-broker-user",
    );
  }

  let autoLinkExecution = autoLinkSubflowExecutions.find(
    (execution) => execution.providerId === "idp-auto-link",
  );

  if (!autoLinkExecution) {
    await addKeycloakAuthenticationExecution(
      adminAccessToken,
      autoLinkSubflowAlias,
      "idp-auto-link",
    );
    autoLinkSubflowExecutions = await getKeycloakAuthenticationExecutions(
      adminAccessToken,
      autoLinkSubflowAlias,
    );
    autoLinkExecution = autoLinkSubflowExecutions.find(
      (execution) => execution.providerId === "idp-auto-link",
    );
  }

  if (!detectExistingExecution) {
    throw new Error(
      "Keycloak idp-detect-existing-broker-user execution is unavailable.",
    );
  }

  if (!autoLinkExecution) {
    throw new Error("Keycloak idp-auto-link execution is unavailable.");
  }

  await updateKeycloakAuthenticationExecutionRequirement(
    adminAccessToken,
    autoLinkSubflowAlias,
    detectExistingExecution,
    "REQUIRED",
  );
  await updateKeycloakAuthenticationExecutionRequirement(
    adminAccessToken,
    autoLinkSubflowAlias,
    autoLinkExecution,
    "REQUIRED",
  );

  userCreationExecutions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    userCreationFlowAlias,
  );
  for (const execution of userCreationExecutions) {
    if (execution.level !== 0) {
      continue;
    }

    if (
      execution.id === autoLinkSubflow.id ||
      execution.providerId === "idp-create-user-if-unique"
    ) {
      continue;
    }

    if (
      execution.providerId === "idp-detect-existing-broker-user" ||
      execution.providerId === "idp-auto-link" ||
      execution.providerId === "idp-confirm-link" ||
      execution.providerId === "idp-email-verification" ||
      execution.displayName
        ?.toLowerCase()
        .includes("handle existing account") ||
      execution.displayName?.toLowerCase().includes("confirm link") ||
      execution.displayName?.toLowerCase().includes("verify existing") ||
      execution.displayName?.toLowerCase().includes("review profile")
    ) {
      await updateKeycloakAuthenticationExecutionRequirement(
        adminAccessToken,
        userCreationFlowAlias,
        execution,
        "DISABLED",
      );
    }
  }

  autoLinkSubflowExecutions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    autoLinkSubflowAlias,
  );
  detectExistingExecution =
    autoLinkSubflowExecutions.find(
      (execution) => execution.providerId === "idp-detect-existing-broker-user",
    ) ?? detectExistingExecution;
  autoLinkExecution =
    autoLinkSubflowExecutions.find(
      (execution) => execution.providerId === "idp-auto-link",
    ) ?? autoLinkExecution;
  await updateKeycloakAuthenticationExecutionRequirement(
    adminAccessToken,
    autoLinkSubflowAlias,
    detectExistingExecution,
    "REQUIRED",
  );
  await updateKeycloakAuthenticationExecutionRequirement(
    adminAccessToken,
    autoLinkSubflowAlias,
    autoLinkExecution,
    "REQUIRED",
  );

  let createUserExecution = userCreationExecutions.find(
    (execution) =>
      execution.level === 0 &&
      execution.providerId === "idp-create-user-if-unique",
  );

  if (createUserExecution) {
    await updateKeycloakAuthenticationExecutionRequirement(
      adminAccessToken,
      userCreationFlowAlias,
      createUserExecution,
      "ALTERNATIVE",
    );
  }

  while ((detectExistingExecution.index ?? 0) > 0) {
    await raiseKeycloakAuthenticationExecutionPriority(
      adminAccessToken,
      detectExistingExecution,
    );
    autoLinkSubflowExecutions = await getKeycloakAuthenticationExecutions(
      adminAccessToken,
      autoLinkSubflowAlias,
    );
    detectExistingExecution =
      autoLinkSubflowExecutions.find(
        (execution) =>
          execution.providerId === "idp-detect-existing-broker-user",
      ) ?? detectExistingExecution;
  }

  userCreationExecutions = await getKeycloakAuthenticationExecutions(
    adminAccessToken,
    userCreationFlowAlias,
  );
  autoLinkSubflow =
    userCreationExecutions.find(
      (execution) => execution.displayName === autoLinkSubflowAlias,
    ) ?? autoLinkSubflow;
  createUserExecution =
    userCreationExecutions.find(
      (execution) =>
        execution.level === 0 &&
        execution.providerId === "idp-create-user-if-unique",
    ) ?? createUserExecution;
  while (createUserExecution && (createUserExecution.index ?? 0) > 0) {
    await raiseKeycloakAuthenticationExecutionPriority(
      adminAccessToken,
      createUserExecution,
    );
    userCreationExecutions = await getKeycloakAuthenticationExecutions(
      adminAccessToken,
      userCreationFlowAlias,
    );
    createUserExecution =
      userCreationExecutions.find(
        (execution) =>
          execution.level === 0 &&
          execution.providerId === "idp-create-user-if-unique",
      ) ?? createUserExecution;
    autoLinkSubflow =
      userCreationExecutions.find(
        (execution) => execution.displayName === autoLinkSubflowAlias,
      ) ?? autoLinkSubflow;
  }
}

async function ensureGoogleIdentityProvider() {
  const googleConfig = getGoogleIdentityProviderConfig();

  if (!googleConfig) {
    return false;
  }

  const config = getKeycloakConfig();
  const adminAccessToken = await getAdminAccessToken();
  await ensureKeycloakFirstBrokerAutoLink(adminAccessToken);
  const identityProvider = {
    addReadTokenRoleOnCreate: false,
    alias: "google",
    authenticateByDefault: false,
    config: {
      clientId: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      defaultScope: "openid profile email",
      syncMode: "IMPORT",
      useJwksUrl: "true",
    },
    displayName: "Google",
    enabled: true,
    firstBrokerLoginFlowAlias: "syndeocare first broker login",
    linkOnly: false,
    providerId: "google",
    storeToken: false,
    trustEmail: true,
  };
  const baseUrl = `${config.baseUrl}/admin/realms/${config.realm}/identity-provider/instances`;
  const lookupResponse = await fetch(`${baseUrl}/google`, {
    headers: {
      authorization: `Bearer ${adminAccessToken}`,
    },
  });
  const method = lookupResponse.status === 404 ? "POST" : "PUT";
  const url = method === "POST" ? baseUrl : `${baseUrl}/google`;
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${adminAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(identityProvider),
  });

  if (!response.ok) {
    throw new Error("Keycloak Google identity provider configuration failed.");
  }

  return true;
}

function getEmailActionTtlSeconds(action: "verify-email" | "reset-password") {
  return action === "verify-email" ? 60 * 60 * 24 : 60 * 30;
}

function getEmailOtpWindow(timestampMs = Date.now()) {
  return Math.floor(timestampMs / 1000 / EMAIL_OTP_TTL_SECONDS);
}

function generateEmailOtp(email: string, window = getEmailOtpWindow()) {
  const digest = createHmac("sha256", getAuthEmailTokenSecret())
    .update(`${email.toLowerCase()}:${window}`)
    .digest();
  const value = digest.readUInt32BE(0) % 1_000_000;

  return String(value).padStart(6, "0");
}

function isValidEmailOtp(email: string, code: string) {
  const normalizedCode = code.trim();
  const currentWindow = getEmailOtpWindow();

  return [currentWindow, currentWindow - 1].some((window) => {
    const expected = generateEmailOtp(email, window);

    return (
      expected.length === normalizedCode.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(normalizedCode))
    );
  });
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signEmailActionToken(
  payload: z.infer<typeof authEmailActionTokenSchema>,
) {
  const serializedPayload = JSON.stringify(payload);
  const encodedPayload = encodeBase64Url(serializedPayload);
  const signature = createHmac("sha256", getAuthEmailTokenSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyEmailActionToken(
  token: string,
  expectedAction: z.infer<typeof authEmailActionTokenSchema>["action"],
) {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new Error("The token format is invalid.");
  }

  const expectedSignature = createHmac("sha256", getAuthEmailTokenSecret())
    .update(encodedPayload)
    .digest("base64url");

  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(providedSignature, "utf8"),
    )
  ) {
    throw new Error("The token signature is invalid.");
  }

  const payload = authEmailActionTokenSchema.parse(
    JSON.parse(decodeBase64Url(encodedPayload)),
  );

  if (payload.action !== expectedAction) {
    throw new Error("The token action does not match the requested operation.");
  }

  if (payload.exp * 1000 <= Date.now()) {
    throw new Error("The token has expired.");
  }

  return payload;
}

function appendTokenToRedirectUrl(redirectUrl: string, token: string) {
  const url = new URL(redirectUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function buildNotificationHtml(options: {
  action: "verify-email" | "reset-password";
  actionUrl: string;
  displayName?: string;
}) {
  const actionLabel =
    options.action === "verify-email" ? "Verify email" : "Reset password";
  const intro =
    options.action === "verify-email"
      ? "Confirm your email address to continue with SyndeoCare."
      : "Reset your SyndeoCare password using the secure link below.";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="margin-bottom: 12px;">${actionLabel}</h1>
      <p>Hi ${options.displayName ?? "there"},</p>
      <p>${intro}</p>
      <p style="margin: 24px 0;">
        <a href="${options.actionUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 9999px; font-weight: 600;">
          ${actionLabel}
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${options.actionUrl}">${options.actionUrl}</a></p>
      <p>This link will expire soon for security reasons.</p>
    </div>
  `;
}

function buildEmailOtpHtml(options: { code: string; displayName?: string }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="margin-bottom: 12px;">Verify your email</h1>
      <p>Hi ${options.displayName ?? "there"},</p>
      <p>Use this verification code to finish creating your SyndeoCare account:</p>
      <p style="font-size: 32px; letter-spacing: 8px; font-weight: 700; margin: 24px 0; color: #663C6D;">
        ${options.code}
      </p>
      <p>This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p>
    </div>
  `;
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

function mapExistingTokenSet(accessToken: string, refreshToken?: string) {
  const decodedToken = decodeAccessToken(accessToken);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = typeof decodedToken?.exp === "number" ? decodedToken.exp : null;

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: exp ? Math.max(exp - nowSeconds, 1) : 300,
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

function getDecodedTokenString(
  decodedToken: ReturnType<typeof decodeAccessToken>,
  key: string,
) {
  const value = decodedToken?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getDecodedTokenImageUrl(
  decodedToken: ReturnType<typeof decodeAccessToken>,
) {
  const picture = getDecodedTokenString(decodedToken, "picture");
  const avatarUrl = getDecodedTokenString(decodedToken, "avatar_url");

  return picture ?? avatarUrl;
}

async function buildSessionFromTokenPayload(
  payload: z.infer<typeof keycloakTokenResponseSchema>,
  options?: {
    fallbackRole?: z.infer<typeof authSignUpInputSchema>["role"];
    isNewUser?: boolean;
  },
) {
  const config = getKeycloakConfig();
  const decodedToken = decodeAccessToken(payload.access_token);
  let principal: z.infer<typeof authPrincipalSchema> | undefined =
    buildAuthPrincipalFromAccessToken(payload.access_token, config.apiClientId);

  if (!principal && decodedToken?.sub) {
    const existingActor = await getAuthPrincipalBySubject(decodedToken.sub);
    principal = existingActor ?? undefined;
  }

  if (!principal && decodedToken?.sub && options?.fallbackRole) {
    principal = authPrincipalSchema.parse({
      sub: decodedToken.sub,
      email:
        typeof decodedToken.email === "string" ? decodedToken.email : undefined,
      emailVerified: decodedToken.email_verified === true,
      role: options.fallbackRole,
      permissions: [],
      onboardingCompleted: false,
      verificationStatus: "not_started",
      displayName:
        getDecodedTokenString(decodedToken, "name") ??
        getDecodedTokenString(decodedToken, "preferred_username"),
      profileImageUrl: getDecodedTokenImageUrl(decodedToken),
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
    profileImageUrl:
      principal.profileImageUrl ?? getDecodedTokenImageUrl(decodedToken),
    role: principal.role,
  });

  return {
    ok: true as const,
    data: authSessionSchema.parse({
      isNewUser: options?.isNewUser === true,
      principal: {
        ...persistedPrincipal,
        emailVerified:
          principal.emailVerified ?? decodedToken?.email_verified === true,
      },
      tokens: mapTokenSet(payload),
    }),
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

async function getKeycloakUser(adminAccessToken: string, userId: string) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(userId)}`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Keycloak user lookup failed.");
  }

  return keycloakUserRepresentationSchema.parse(await response.json());
}

async function findKeycloakUserByEmail(
  adminAccessToken: string,
  email: string,
) {
  const users = await findKeycloakUsersByEmail(adminAccessToken, email);

  return users[0] ?? null;
}

async function findKeycloakUsersByEmail(
  adminAccessToken: string,
  email: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users?email=${encodeURIComponent(email)}&exact=true`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Keycloak email lookup failed.");
  }

  const users = z
    .array(keycloakUserRepresentationSchema)
    .parse(await response.json());

  return users.filter(
    (user) =>
      typeof user.email === "string" &&
      user.email.toLowerCase() === email.toLowerCase(),
  );
}

async function updateKeycloakUser(
  adminAccessToken: string,
  userId: string,
  patch: Partial<z.infer<typeof keycloakUserRepresentationSchema>>,
) {
  const config = getKeycloakConfig();
  const currentUser = await getKeycloakUser(adminAccessToken, userId);
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...currentUser,
        ...patch,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Keycloak user update failed.");
  }
}

async function getKeycloakUserInfo(accessToken: string) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/userinfo`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  return keycloakUserInfoSchema.parse(await response.json());
}

async function getKeycloakFederatedIdentities(
  adminAccessToken: string,
  userId: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(userId)}/federated-identity`,
    {
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Keycloak federated identity lookup failed.");
  }

  return z.array(keycloakFederatedIdentitySchema).parse(await response.json());
}

async function linkKeycloakFederatedIdentity(
  adminAccessToken: string,
  targetUserId: string,
  identity: z.infer<typeof keycloakFederatedIdentitySchema>,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(targetUserId)}/federated-identity/${encodeURIComponent(identity.identityProvider)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(identity),
    },
  );

  if (!response.ok && response.status !== 409) {
    throw new Error("Keycloak federated identity link failed.");
  }
}

async function deleteDuplicateKeycloakUser(
  adminAccessToken: string,
  userId: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Keycloak duplicate user cleanup failed.");
  }
}

async function resetKeycloakUserPassword(
  adminAccessToken: string,
  userId: string,
  password: string,
) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        temporary: false,
        type: "password",
        value: password,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Keycloak password reset failed.");
  }
}

async function deleteKeycloakUser(adminAccessToken: string, userId: string) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/admin/realms/${config.realm}/users/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Keycloak account deletion failed.");
  }
}

function buildInternalNotificationHeaders() {
  return {
    "content-type": "application/json",
    ...(process.env.INTERNAL_SERVICE_TOKEN
      ? {
          "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN,
        }
      : {}),
  };
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
        // Create as verified for the first password grant, then mark unverified
        // after the app session is issued when email verification is enabled.
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

async function recoverUnverifiedSignupAccount(
  input: z.infer<typeof authSignUpInputSchema>,
) {
  const adminAccessToken = await getAdminAccessToken();
  const existingUser = await findKeycloakUserByEmail(
    adminAccessToken,
    input.email,
  ).catch(() => null);

  if (!existingUser || existingUser.emailVerified === true) {
    return {
      code: "AUTH_ACCOUNT_EXISTS",
      ok: false as const,
      statusCode: 409,
    };
  }

  const { firstName, lastName } = splitDisplayName(input.displayName);
  await updateKeycloakUser(adminAccessToken, existingUser.id, {
    email: input.email,
    emailVerified: true,
    enabled: true,
    firstName,
    lastName: lastName.length > 0 ? lastName : undefined,
    username: input.email,
  });
  await resetKeycloakUserPassword(
    adminAccessToken,
    existingUser.id,
    input.password,
  );
  await assignRealmRole(adminAccessToken, existingUser.id, input.role);

  return {
    ok: true as const,
    userId: existingUser.id,
  };
}

async function isUnverifiedKeycloakUser(email: string) {
  const adminAccessToken = await getAdminAccessToken();
  const user = await findKeycloakUserByEmail(adminAccessToken, email).catch(
    () => null,
  );

  return user?.emailVerified === false;
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
    if (
      isEmailVerificationRequired() &&
      (await isUnverifiedKeycloakUser(input.email).catch(() => false))
    ) {
      return {
        ok: false as const,
        statusCode: 403,
        body: {
          code: "AUTH_EMAIL_VERIFICATION_REQUIRED",
          message:
            "Please verify your email before signing in. We sent you a new verification code.",
        },
      };
    }

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

  return buildSessionFromTokenPayload(
    keycloakTokenResponseSchema.parse(payload),
    {
      fallbackRole,
      isNewUser: false,
    },
  );
}

async function verifyKeycloakUserPassword(
  adminAccessToken: string,
  userId: string,
  password: string,
) {
  const config = getKeycloakConfig();
  const user = await getKeycloakUser(adminAccessToken, userId);
  const username = user.email ?? user.username;

  if (!username) {
    throw new Error("Keycloak user has no login identifier.");
  }

  const { response } = await requestKeycloakForm(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: config.publicClientId,
      grant_type: "password",
      password,
      scope: "openid profile email",
      username,
    }),
  );

  if (response.status === 400 || response.status === 401) {
    return false;
  }

  if (!response.ok) {
    throw new Error("Keycloak current password verification failed.");
  }

  return true;
}

async function exchangePasswordForSessionWithRetry(
  input: z.infer<typeof authSignInInputSchema>,
  fallbackRole: z.infer<typeof authSignUpInputSchema>["role"],
  attempts = 4,
) {
  let lastResult:
    | Awaited<ReturnType<typeof exchangePasswordForSession>>
    | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastResult = await exchangePasswordForSession(input, fallbackRole);

    if (
      lastResult.ok ||
      lastResult.statusCode !== 401 ||
      attempt === attempts - 1
    ) {
      return lastResult;
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  return lastResult!;
}

async function refreshKeycloakTokenPayload(refreshToken: string) {
  const config = getKeycloakConfig();
  const { payload, response } = await requestKeycloakForm(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: config.publicClientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );

  if (!response.ok) {
    return null;
  }

  return keycloakTokenResponseSchema.parse(payload);
}

async function exchangeOAuthCodeForSession(
  input: z.infer<typeof authOAuthCallbackInputSchema>,
) {
  const config = getKeycloakConfig();
  const { payload, response } = await requestKeycloakForm(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: resolveOAuthPublicClientId(
        input.clientId,
        config.publicClientId,
      ),
      code: input.code,
      code_verifier: input.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
  );

  if (response.status === 400 || response.status === 401) {
    return {
      ok: false as const,
      statusCode: 401,
      body: {
        code: "AUTH_OAUTH_CODE_INVALID",
        message: "Google sign-in could not be completed. Please try again.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      statusCode: 503,
      body: {
        code: "AUTH_PROVIDER_UNAVAILABLE",
        message: "Keycloak is unavailable. Check the auth service.",
      },
    };
  }

  let tokenPayload = keycloakTokenResponseSchema.parse(payload);
  const decodedToken = decodeAccessToken(tokenPayload.access_token);
  const oauthEmail = getDecodedTokenString(decodedToken, "email");
  const oauthEmailVerified = decodedToken?.email_verified === true;
  const oauthDisplayName =
    getDecodedTokenString(decodedToken, "name") ??
    getDecodedTokenString(decodedToken, "preferred_username");
  const oauthImageUrl = getDecodedTokenImageUrl(decodedToken);

  if (!decodedToken?.sub) {
    return {
      ok: false as const,
      statusCode: 401,
      body: {
        code: "AUTH_OAUTH_TOKEN_INVALID",
        message: "Google returned an identity token without a subject.",
      },
    };
  }

  const linkUserInfo = input.linkAccessToken
    ? await getKeycloakUserInfo(input.linkAccessToken)
    : null;
  const canLinkToCurrentSession =
    linkUserInfo?.sub &&
    linkUserInfo.sub !== decodedToken.sub &&
    linkUserInfo.email &&
    oauthEmail &&
    linkUserInfo.email.toLowerCase() === oauthEmail.toLowerCase();

  if (canLinkToCurrentSession) {
    const adminAccessToken = await getAdminAccessToken();
    const existingActor = await getAuthPrincipalBySubject(linkUserInfo.sub);
    const linkRole =
      existingActor?.role === "clinic" ||
      existingActor?.role === "professional" ||
      existingActor?.role === "admin"
        ? existingActor.role
        : input.role;

    if (!linkRole) {
      return {
        ok: false as const,
        statusCode: 409,
        body: {
          code: "AUTH_OAUTH_ROLE_REQUIRED",
          message:
            "Choose whether you are joining as a clinic or professional before continuing with Google.",
        },
      };
    }

    const sourceIdentities = await getKeycloakFederatedIdentities(
      adminAccessToken,
      decodedToken.sub,
    );
    const googleIdentity = sourceIdentities.find(
      (identity) => identity.identityProvider === "google",
    );

    if (googleIdentity) {
      await linkKeycloakFederatedIdentity(
        adminAccessToken,
        linkUserInfo.sub,
        googleIdentity,
      );
      await deleteDuplicateKeycloakUser(adminAccessToken, decodedToken.sub);
    }

    const linkedPrincipal = await ensureActorAccount({
      subject: linkUserInfo.sub,
      email: linkUserInfo.email,
      displayName:
        existingActor?.displayName ?? linkUserInfo.name ?? oauthDisplayName,
      profileImageUrl:
        existingActor?.profileImageUrl ?? linkUserInfo.picture ?? oauthImageUrl,
      role: linkRole,
    });

    return {
      ok: true as const,
      data: authSessionSchema.parse({
        isNewUser: false,
        principal: {
          ...linkedPrincipal,
          emailVerified:
            linkedPrincipal.emailVerified ?? linkUserInfo.email_verified,
        },
        tokens: mapExistingTokenSet(
          input.linkAccessToken!,
          input.linkRefreshToken,
        ),
      }),
    };
  }

  if (oauthEmail && oauthEmailVerified) {
    const adminAccessToken = await getAdminAccessToken();
    const sameEmailUsers = await findKeycloakUsersByEmail(
      adminAccessToken,
      oauthEmail,
    );
    const existingEmailUser = sameEmailUsers.find(
      (user) => user.id !== decodedToken.sub,
    );

    if (existingEmailUser) {
      const sourceIdentities = await getKeycloakFederatedIdentities(
        adminAccessToken,
        decodedToken.sub,
      );
      const googleIdentity = sourceIdentities.find(
        (identity) => identity.identityProvider === "google",
      );

      if (googleIdentity) {
        await linkKeycloakFederatedIdentity(
          adminAccessToken,
          existingEmailUser.id,
          googleIdentity,
        );
        await deleteDuplicateKeycloakUser(adminAccessToken, decodedToken.sub);
      }

      return {
        ok: false as const,
        statusCode: 409,
        body: {
          code: "AUTH_OAUTH_ACCOUNT_LINKED_RETRY",
          message:
            "Google is now connected to your existing SyndeoCare account. Continue with Google again to sign in.",
        },
      };
    }
  }

  const existingActor = await getAuthPrincipalBySubject(decodedToken.sub);
  const existingPublicRole =
    existingActor?.role === "clinic" || existingActor?.role === "professional"
      ? existingActor.role
      : undefined;
  const fallbackRole = existingPublicRole ?? input.role;

  if (!fallbackRole && !existingActor) {
    return {
      ok: false as const,
      statusCode: 409,
      body: {
        code: "AUTH_OAUTH_ROLE_REQUIRED",
        message:
          "Choose whether you are joining as a clinic or professional before continuing with Google.",
      },
    };
  }

  if (fallbackRole) {
    const adminAccessToken = await getAdminAccessToken();
    await assignRealmRole(adminAccessToken, decodedToken.sub, fallbackRole);

    if (tokenPayload.refresh_token) {
      tokenPayload =
        (await refreshKeycloakTokenPayload(tokenPayload.refresh_token)) ??
        tokenPayload;
    }
  }

  return buildSessionFromTokenPayload(tokenPayload, {
    fallbackRole,
    isNewUser: !existingActor,
  });
}

async function refreshSession(input: z.infer<typeof authRefreshInputSchema>) {
  const config = getKeycloakConfig();
  const { payload, response } = await requestKeycloakForm(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: config.publicClientId,
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    }),
  );

  if (response.status === 401 || response.status === 400) {
    return {
      ok: false as const,
      statusCode: 401,
      body: {
        code: "AUTH_REFRESH_INVALID",
        message: "The refresh token is invalid or has expired.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      statusCode: 503,
      body: {
        code: "AUTH_PROVIDER_UNAVAILABLE",
        message:
          "Keycloak is unavailable. Check the auth service before retrying session refresh.",
      },
    };
  }

  return buildSessionFromTokenPayload(
    keycloakTokenResponseSchema.parse(payload),
    {
      isNewUser: false,
    },
  );
}

async function revokeSession(input: z.infer<typeof authLogoutInputSchema>) {
  const config = getKeycloakConfig();
  const response = await fetch(
    `${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/logout`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.publicClientId,
        refresh_token: input.refreshToken,
      }),
    },
  );

  if (response.status === 400 || response.status === 401) {
    return {
      ok: false as const,
      statusCode: 401,
      body: {
        code: "AUTH_LOGOUT_INVALID",
        message: "The refresh token is invalid or has already been revoked.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      statusCode: 503,
      body: {
        code: "AUTH_PROVIDER_UNAVAILABLE",
        message:
          "Keycloak is unavailable. Check the auth service before retrying logout.",
      },
    };
  }

  return {
    ok: true as const,
    data: authLogoutResponseSchema.parse({
      revoked: true,
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
      headers: buildInternalNotificationHeaders(),
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

async function sendAuthActionEmail(options: {
  action: "verify-email" | "reset-password";
  displayName?: string;
  email: string;
  redirectUrl: string;
  subject: string;
  userId: string;
}) {
  const token = signEmailActionToken({
    action: options.action,
    email: options.email,
    exp:
      Math.floor(Date.now() / 1000) + getEmailActionTtlSeconds(options.action),
    sub: options.userId,
  });
  const requestBody = notificationEmailRequestSchema.parse({
    actorSubject: options.userId,
    html: buildNotificationHtml({
      action: options.action,
      actionUrl: appendTokenToRedirectUrl(options.redirectUrl, token),
      displayName: options.displayName,
    }),
    subject: options.subject,
    toEmail: options.email,
  });
  const response = await fetch(
    new URL(
      "/internal/notifications/email",
      `${getNotificationsServiceUrl()}/`,
    ),
    {
      method: "POST",
      headers: buildInternalNotificationHeaders(),
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
        : "The notifications service could not send the auth email.",
    );
  }

  notificationDeliveryResponseSchema.parse(payload);
}

async function requestPasswordReset(
  input: z.infer<typeof authPasswordResetRequestInputSchema>,
) {
  const adminAccessToken = await getAdminAccessToken();
  const user = await findKeycloakUserByEmail(
    adminAccessToken,
    input.email,
  ).catch(() => null);

  if (user?.email) {
    await sendAuthActionEmail({
      action: "reset-password",
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      email: user.email,
      redirectUrl: input.redirectUrl,
      subject: "Reset your SyndeoCare password",
      userId: user.id,
    });
  }

  return authEmailActionResponseSchema.parse({
    delivered: true,
  });
}

async function confirmPasswordReset(
  input: z.infer<typeof authPasswordResetConfirmInputSchema>,
) {
  const tokenPayload = verifyEmailActionToken(input.token, "reset-password");
  const adminAccessToken = await getAdminAccessToken();
  await resetKeycloakUserPassword(
    adminAccessToken,
    tokenPayload.sub,
    input.password,
  );

  return authPasswordUpdateResponseSchema.parse({
    updated: true,
  });
}

async function requestEmailVerification(
  input: z.infer<typeof authEmailVerificationRequestInputSchema>,
) {
  const adminAccessToken = await getAdminAccessToken();
  const user = await findKeycloakUserByEmail(
    adminAccessToken,
    input.email,
  ).catch(() => null);

  if (user?.email && user.emailVerified !== true) {
    await sendAuthActionEmail({
      action: "verify-email",
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      email: user.email,
      redirectUrl: input.redirectUrl,
      subject: "Verify your SyndeoCare email",
      userId: user.id,
    });
  }

  return authEmailActionResponseSchema.parse({
    delivered: true,
  });
}

async function requestEmailOtp(
  input: z.infer<typeof authEmailOtpRequestInputSchema>,
) {
  const adminAccessToken = await getAdminAccessToken();
  const user = await findKeycloakUserByEmail(
    adminAccessToken,
    input.email,
  ).catch(() => null);

  if (user?.email && user.emailVerified !== true) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;
    const code = generateEmailOtp(user.email);
    const requestBody = notificationEmailRequestSchema.parse({
      actorSubject: user.id,
      html: buildEmailOtpHtml({
        code,
        displayName,
      }),
      subject: "Your SyndeoCare verification code",
      toEmail: user.email,
    });
    const response = await fetch(
      new URL(
        "/internal/notifications/email",
        `${getNotificationsServiceUrl()}/`,
      ),
      {
        method: "POST",
        headers: buildInternalNotificationHeaders(),
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
          : "The notifications service could not send the verification code.",
      );
    }

    notificationDeliveryResponseSchema.parse(payload);
  }

  return authEmailActionResponseSchema.parse({
    delivered: true,
  });
}

async function confirmEmailVerification(
  input: z.infer<typeof authEmailVerificationConfirmInputSchema>,
) {
  const tokenPayload = verifyEmailActionToken(input.token, "verify-email");
  const adminAccessToken = await getAdminAccessToken();
  await updateKeycloakUser(adminAccessToken, tokenPayload.sub, {
    emailVerified: true,
  });

  return authEmailVerificationConfirmResponseSchema.parse({
    verified: true,
  });
}

async function confirmEmailOtp(
  input: z.infer<typeof authEmailOtpConfirmInputSchema>,
) {
  if (!isValidEmailOtp(input.email, input.code)) {
    throw new Error("The verification code is invalid or expired.");
  }

  const adminAccessToken = await getAdminAccessToken();
  const user = await findKeycloakUserByEmail(adminAccessToken, input.email);

  if (!user?.email) {
    throw new Error("No account was found for this email address.");
  }

  await updateKeycloakUser(adminAccessToken, user.id, {
    emailVerified: true,
  });

  return authEmailVerificationConfirmResponseSchema.parse({
    verified: true,
  });
}

async function updateActorPassword(options: {
  currentPassword: string;
  password: string;
  subject: string;
}) {
  const adminAccessToken = await getAdminAccessToken();
  const currentPasswordValid = await verifyKeycloakUserPassword(
    adminAccessToken,
    options.subject,
    options.currentPassword,
  );

  if (!currentPasswordValid) {
    throw new InvalidCurrentPasswordError();
  }

  await resetKeycloakUserPassword(
    adminAccessToken,
    options.subject,
    options.password,
  );

  return authPasswordUpdateResponseSchema.parse({
    updated: true,
  });
}

async function deleteActorAccount(subject: string) {
  const adminAccessToken = await getAdminAccessToken();
  await deleteKeycloakUser(adminAccessToken, subject);
  await deleteActorBySubject(subject);

  return authAccountDeletionResponseSchema.parse({
    deleted: true,
  });
}

void startService({
  serviceName: "identity",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.identity,
  async register(app) {
    try {
      const configuredGoogle = await ensureGoogleIdentityProvider();

      if (configuredGoogle) {
        app.log.info("Keycloak Google identity provider is configured.");
      }
    } catch (error) {
      app.log.warn(
        {
          error: error instanceof Error ? error.message : "unknown error",
        },
        "Keycloak Google identity provider could not be configured automatically.",
      );
    }

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

    app.get("/internal/actors/:subject/preferences", async (request, reply) => {
      const parsed = subjectParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Subject is required.",
        });
      }

      const preferences = await getUserPreferencesBySubject(
        parsed.data.subject,
      );

      if (!preferences) {
        return reply.code(404).send({
          code: "ACTOR_NOT_FOUND",
          message: "No actor was found for the provided auth subject.",
        });
      }

      return preferences;
    });

    app.get("/internal/admin/verification", async () => {
      const snapshot = await listAdminVerificationSnapshot();

      return adminVerificationSnapshotSchema.parse(snapshot);
    });

    app.get("/internal/admin/catalog", async (request, reply) => {
      const parsedQuery = adminCatalogQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid catalog query is required.",
        });
      }

      const items = await listAdminCatalogItems({
        includeInactive: parsedQuery.data.includeInactive,
        kind: parsedQuery.data.kind,
      });

      return adminCatalogListResponseSchema.parse({
        items,
        total: items.length,
      });
    });

    app.post("/internal/admin/catalog", async (request, reply) => {
      const parsedBody = adminCatalogItemInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid catalog item payload is required.",
        });
      }

      const item = await saveAdminCatalogItem(parsedBody.data);

      if (!item) {
        return reply.code(404).send({
          code: "CATALOG_ITEM_NOT_FOUND",
          message: "No catalog item was found for the provided id.",
        });
      }

      return adminCatalogItemSchema.parse(item);
    });

    app.delete("/internal/admin/catalog/:id", async (request, reply) => {
      const parsedParams = adminCatalogParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid catalog item id is required.",
        });
      }

      const deleted = await deleteAdminCatalogItem(parsedParams.data.id);

      return adminCatalogDeleteResponseSchema.parse({ deleted });
    });

    app.patch(
      "/internal/actors/:subject/external-user-id",
      async (request, reply) => {
        const parsedSubject = subjectParamsSchema.safeParse(request.params);
        const parsedBody = externalUserIdSyncInputSchema.safeParse(
          request.body,
        );

        if (!parsedSubject.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid subject and external user id payload are required.",
          });
        }

        const externalUserId = await syncActorExternalUserIdBySubject(
          parsedSubject.data.subject,
          parsedBody.data.externalUserId,
        );

        if (!externalUserId) {
          return reply.code(404).send({
            code: "ACTOR_NOT_FOUND",
            message: "No actor was found for the provided auth subject.",
          });
        }

        return externalUserIdSyncResponseSchema.parse({
          externalUserId,
        });
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

      await publishDomainEvent({
        name: "identity.user.authenticated",
        payload: {
          email: session.data.principal.email,
          role: session.data.principal.role,
        },
        producer: "identity",
        subject: session.data.principal.sub,
      });

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

      let created = await createKeycloakUser(parsedBody.data);

      if (!created.ok && created.statusCode === 409) {
        created = await recoverUnverifiedSignupAccount(parsedBody.data);
      }

      if (!created.ok) {
        return reply.code(created.statusCode).send({
          code: created.code,
          message:
            created.statusCode === 409
              ? "An account already exists for this email address."
              : "Keycloak could not create the account.",
        });
      }

      const session = await exchangePasswordForSessionWithRetry(
        {
          email: parsedBody.data.email,
          password: parsedBody.data.password,
        },
        parsedBody.data.role,
      );

      if (!session.ok) {
        try {
          const adminAccessToken = await getAdminAccessToken();
          await deleteKeycloakUser(adminAccessToken, created.userId);
        } catch (error) {
          request.log.warn(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "unknown signup rollback error",
              subject: created.userId,
            },
            "Could not roll back Keycloak user after signup session failure.",
          );
        }

        return reply.code(session.statusCode).send(session.body);
      }

      if (isEmailVerificationRequired()) {
        try {
          const adminAccessToken = await getAdminAccessToken();
          await updateKeycloakUser(adminAccessToken, created.userId, {
            emailVerified: false,
          });
        } catch (error) {
          request.log.warn(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "unknown email verification update error",
              subject: created.userId,
            },
            "Could not mark new account email as unverified after signup.",
          );
        }
      }

      try {
        await sendWelcomeNotification(session.data);
      } catch (error) {
        request.log.warn(
          {
            error:
              error instanceof Error
                ? error.message
                : "unknown notification error",
            subject: session.data.principal.sub,
          },
          "Welcome notification failed after signup; continuing account creation.",
        );
      }
      await publishDomainEvent({
        name: "identity.user.registered",
        payload: {
          email: session.data.principal.email,
          isNewUser: true,
          role: session.data.principal.role,
        },
        producer: "identity",
        subject: session.data.principal.sub,
      });

      return authSessionSchema.parse({
        ...session.data,
        principal: {
          ...session.data.principal,
          emailVerified: !isEmailVerificationRequired(),
        },
        isNewUser: true,
      });
    });

    app.post("/internal/auth/oauth/google/callback", async (request, reply) => {
      const parsedBody = authOAuthCallbackInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message:
            "A valid OAuth callback code, PKCE verifier, and redirect URI are required.",
        });
      }

      const session = await exchangeOAuthCodeForSession(parsedBody.data);

      if (!session.ok) {
        return reply.code(session.statusCode).send(session.body);
      }

      if (session.data.isNewUser) {
        try {
          await sendWelcomeNotification(session.data);
        } catch (error) {
          request.log.warn(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "unknown notification error",
              subject: session.data.principal.sub,
            },
            "Welcome notification failed after Google signup; continuing account creation.",
          );
        }

        await publishDomainEvent({
          name: "identity.user.registered",
          payload: {
            email: session.data.principal.email,
            isNewUser: true,
            provider: "google",
            role: session.data.principal.role,
          },
          producer: "identity",
          subject: session.data.principal.sub,
        });
      } else {
        await publishDomainEvent({
          name: "identity.user.authenticated",
          payload: {
            email: session.data.principal.email,
            provider: "google",
            role: session.data.principal.role,
          },
          producer: "identity",
          subject: session.data.principal.sub,
        });
      }

      return session.data;
    });

    app.post("/internal/auth/refresh", async (request, reply) => {
      const parsedBody = authRefreshInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid refresh token is required.",
        });
      }

      const session = await refreshSession(parsedBody.data);

      if (!session.ok) {
        return reply.code(session.statusCode).send(session.body);
      }

      return session.data;
    });

    app.post("/internal/auth/logout", async (request, reply) => {
      const parsedBody = authLogoutInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid refresh token is required.",
        });
      }

      const logout = await revokeSession(parsedBody.data);

      if (!logout.ok) {
        return reply.code(logout.statusCode).send(logout.body);
      }

      return logout.data;
    });

    app.post(
      "/internal/auth/password-reset/request",
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

        try {
          return await requestPasswordReset(parsedBody.data);
        } catch (error) {
          return reply.code(503).send({
            code: "AUTH_PROVIDER_UNAVAILABLE",
            message:
              error instanceof Error
                ? error.message
                : "Password reset email delivery is unavailable.",
          });
        }
      },
    );

    app.post(
      "/internal/auth/password-reset/confirm",
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

        try {
          return await confirmPasswordReset(parsedBody.data);
        } catch (error) {
          return reply.code(401).send({
            code: "AUTH_RESET_INVALID",
            message:
              error instanceof Error
                ? error.message
                : "The password reset token is invalid or expired.",
          });
        }
      },
    );

    app.post(
      "/internal/auth/email-verification/request",
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

        try {
          return await requestEmailVerification(parsedBody.data);
        } catch (error) {
          return reply.code(503).send({
            code: "AUTH_PROVIDER_UNAVAILABLE",
            message:
              error instanceof Error
                ? error.message
                : "Verification email delivery is unavailable.",
          });
        }
      },
    );

    app.post(
      "/internal/auth/email-verification/confirm",
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

        try {
          return await confirmEmailVerification(parsedBody.data);
        } catch (error) {
          return reply.code(401).send({
            code: "AUTH_VERIFICATION_INVALID",
            message:
              error instanceof Error
                ? error.message
                : "The verification token is invalid or expired.",
          });
        }
      },
    );

    app.post("/internal/auth/email-otp/request", async (request, reply) => {
      const parsedBody = authEmailOtpRequestInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid email address is required.",
        });
      }

      try {
        return await requestEmailOtp(parsedBody.data);
      } catch (error) {
        return reply.code(503).send({
          code: "AUTH_PROVIDER_UNAVAILABLE",
          message:
            error instanceof Error
              ? error.message
              : "Verification code email delivery is unavailable.",
        });
      }
    });

    app.post("/internal/auth/email-otp/confirm", async (request, reply) => {
      const parsedBody = authEmailOtpConfirmInputSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid email address and six-digit code are required.",
        });
      }

      try {
        return await confirmEmailOtp(parsedBody.data);
      } catch (error) {
        return reply.code(401).send({
          code: "AUTH_OTP_INVALID",
          message:
            error instanceof Error
              ? error.message
              : "The verification code is invalid or expired.",
        });
      }
    });

    app.post("/internal/auth/password", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse({
        subject:
          typeof request.headers["x-auth-subject"] === "string"
            ? request.headers["x-auth-subject"]
            : undefined,
      });
      const parsedBody = authPasswordUpdateInputSchema.safeParse(request.body);

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid actor subject and password are required.",
        });
      }

      try {
        return await updateActorPassword({
          currentPassword: parsedBody.data.currentPassword,
          password: parsedBody.data.password,
          subject: parsedSubject.data.subject,
        });
      } catch (error) {
        if (error instanceof InvalidCurrentPasswordError) {
          return reply.code(401).send({
            code: "AUTH_CURRENT_PASSWORD_INVALID",
            message: error.message,
          });
        }

        return reply.code(503).send({
          code: "AUTH_PROVIDER_UNAVAILABLE",
          message:
            error instanceof Error
              ? error.message
              : "Password update is unavailable.",
        });
      }
    });

    app.delete("/internal/auth/account", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse({
        subject:
          typeof request.headers["x-auth-subject"] === "string"
            ? request.headers["x-auth-subject"]
            : undefined,
      });

      if (!parsedSubject.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid actor subject is required.",
        });
      }

      try {
        return await deleteActorAccount(parsedSubject.data.subject);
      } catch (error) {
        return reply.code(503).send({
          code: "AUTH_PROVIDER_UNAVAILABLE",
          message:
            error instanceof Error
              ? error.message
              : "Account deletion is unavailable.",
        });
      }
    });

    app.patch(
      "/internal/actors/:subject/preferences",
      async (request, reply) => {
        const parsedSubject = subjectParamsSchema.safeParse(request.params);
        const parsedBody = userPreferencesSchema.safeParse(request.body);

        if (!parsedSubject.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid subject and preferences payload are required.",
          });
        }

        const preferences = await updateUserPreferencesBySubject(
          parsedSubject.data.subject,
          parsedBody.data,
        );

        if (!preferences) {
          return reply.code(404).send({
            code: "ACTOR_NOT_FOUND",
            message: "No actor was found for the provided auth subject.",
          });
        }

        return preferences;
      },
    );

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

    app.post(
      "/internal/actors/:subject/onboarding/documents",
      async (request, reply) => {
        const parsedSubject = subjectParamsSchema.safeParse(request.params);
        const parsedBody = finalizeVerificationDocumentInputSchema.safeParse(
          request.body,
        );

        if (!parsedSubject.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message:
              "A valid subject and verification document payload are required.",
          });
        }

        const onboardingStatus = await persistVerificationDocumentBySubject(
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
