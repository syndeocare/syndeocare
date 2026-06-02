import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type preHandlerHookHandler,
} from "fastify";
import {
  createRemoteJWKSet,
  decodeJwt,
  errors,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { JSONCodec, connect, type NatsConnection } from "nats";
import {
  authPrincipalSchema,
  domainEventCatalog,
  eventEnvelopeSchema,
  gatewayAuthConfigurationSchema,
  gatewayAuthModeSchema,
  type AuthPrincipal,
  type EventEnvelope,
  type EventName,
  type ServiceName,
  type UserRole,
  userRoleSchema,
} from "@repo/contracts";
import { z } from "zod";

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_NATS_URL = "nats://127.0.0.1:4222";
const DEFAULT_NODE_ENV = "development";
const DEFAULT_PORT = 4000;
const INTERNAL_SERVICE_TOKEN_HEADER = "x-internal-service-token";
const eventEnvelopeCodec = JSONCodec<EventEnvelope>();
let natsConnectionPromise: Promise<NatsConnection> | undefined;
const DEVELOPMENT_HEADER_NAMES = [
  "x-dev-user-id",
  "x-dev-user-role",
  "x-dev-user-email",
  "x-dev-clinic-id",
  "x-dev-profile-id",
  "x-dev-onboarding-completed",
  "x-dev-verification-status",
  "x-dev-display-name",
] as const;

declare module "fastify" {
  interface FastifyRequest {
    authContext?: AuthPrincipal;
  }
}

type ServiceBootstrapOptions = {
  serviceName: ServiceName;
  version: string;
  register?: (app: FastifyInstance) => Promise<void> | void;
  serviceEvents?: readonly EventName[];
};

type AuthMode = z.infer<typeof gatewayAuthModeSchema>;

type InternalAuthConfiguration = z.infer<typeof gatewayAuthConfigurationSchema>;

type AccessControlOptions = {
  roles?: readonly UserRole[];
};

type AccessControl = {
  configuration: InternalAuthConfiguration;
  requireAccess: (options?: AccessControlOptions) => preHandlerHookHandler;
};

function readHeaderValue(
  headers: FastifyRequest["headers"],
  name: string,
): string | undefined {
  const value = headers[name];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

function extractRealmFromIssuer(issuer: string | undefined) {
  if (!issuer) {
    return undefined;
  }

  const segments = issuer.split("/").filter(Boolean);
  const realmIndex = segments.lastIndexOf("realms");

  if (realmIndex === -1 || realmIndex === segments.length - 1) {
    return undefined;
  }

  return segments[realmIndex + 1];
}

function resolveAuthMode(): AuthMode {
  const result = gatewayAuthModeSchema.safeParse(
    process.env.AUTH_MODE ?? "strict",
  );

  return result.success ? result.data : "strict";
}

function isDevelopmentBypassEnabled() {
  return (
    process.env.ENABLE_DEV_AUTH_BYPASS === "true" &&
    (process.env.NODE_ENV ?? DEFAULT_NODE_ENV) !== "production"
  );
}

function loadAuthConfiguration(): InternalAuthConfiguration {
  const mode = resolveAuthMode();
  const issuer = process.env.AUTH_ISSUER_URL;
  const audience = process.env.AUTH_AUDIENCE;
  const clientId = process.env.AUTH_CLIENT_ID;
  const realm = process.env.AUTH_REALM ?? extractRealmFromIssuer(issuer);
  const jwksUri =
    process.env.AUTH_JWKS_URI ??
    (issuer
      ? `${issuer.replace(/\/$/, "")}/protocol/openid-connect/certs`
      : undefined);

  if (mode === "development-bypass") {
    const configured = isDevelopmentBypassEnabled();

    return gatewayAuthConfigurationSchema.parse({
      mode,
      configured,
      developmentHeaders: [...DEVELOPMENT_HEADER_NAMES],
    });
  }

  return gatewayAuthConfigurationSchema.parse({
    mode,
    configured: Boolean(issuer && audience && clientId),
    issuer,
    audience,
    clientId,
    realm,
    jwksUri,
  });
}

function parseAuthorizationHeader(headerValue: string | undefined) {
  if (!headerValue) {
    return undefined;
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return undefined;
  }

  return token;
}

function readStringClaim(
  payload: JWTPayload,
  claimName: string,
): string | undefined {
  const value = payload[claimName];
  return typeof value === "string" ? value : undefined;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function extractKeycloakRoles(payload: JWTPayload, clientId: string) {
  const realmAccess =
    typeof payload.realm_access === "object" && payload.realm_access !== null
      ? (payload.realm_access as { roles?: unknown })
      : undefined;
  const realmRoles = isStringArray(realmAccess?.roles) ? realmAccess.roles : [];

  const resourceAccess =
    typeof payload.resource_access === "object" &&
    payload.resource_access !== null
      ? (payload.resource_access as Record<string, unknown>)
      : undefined;
  const clientAccess =
    resourceAccess &&
    typeof resourceAccess[clientId] === "object" &&
    resourceAccess[clientId] !== null
      ? (resourceAccess[clientId] as { roles?: unknown })
      : undefined;
  const clientRoles = isStringArray(clientAccess?.roles)
    ? clientAccess.roles
    : [];

  return [...new Set([...clientRoles, ...realmRoles])];
}

function resolveUserRole(candidateRoles: string[]): UserRole | undefined {
  const roleOrder: UserRole[] = ["admin", "clinic", "professional"];

  return roleOrder.find((role) => candidateRoles.includes(role));
}

export function buildAuthPrincipalFromPayload(
  payload: JWTPayload,
  clientId: string,
): AuthPrincipal | undefined {
  const candidateRoles = extractKeycloakRoles(payload, clientId);
  const role = resolveUserRole(candidateRoles);

  if (!payload.sub || !role) {
    return undefined;
  }

  const parsed = authPrincipalSchema.safeParse({
    sub: payload.sub,
    email: readStringClaim(payload, "email"),
    role,
    permissions: candidateRoles.filter(
      (candidateRole) => candidateRole !== role,
    ),
    clinicId: readStringClaim(payload, "clinic_id"),
    profileId: readStringClaim(payload, "profile_id"),
    onboardingCompleted: payload.onboarding_completed === true,
    verificationStatus: readStringClaim(payload, "verification_status"),
    displayName:
      readStringClaim(payload, "name") ??
      readStringClaim(payload, "preferred_username"),
  });

  return parsed.success ? parsed.data : undefined;
}

export function buildAuthPrincipalFromAccessToken(
  accessToken: string,
  clientId: string,
): AuthPrincipal | undefined {
  const payload = decodeAccessToken(accessToken);

  if (!payload) {
    return undefined;
  }

  return buildAuthPrincipalFromPayload(payload, clientId);
}

export function decodeAccessToken(accessToken: string): JWTPayload | undefined {
  try {
    return decodeJwt(accessToken);
  } catch {
    return undefined;
  }
}

function buildAuthPrincipalFromDevelopmentHeaders(
  request: FastifyRequest,
): AuthPrincipal | undefined {
  const roleHeader = readHeaderValue(request.headers, "x-dev-user-role");
  const userIdHeader = readHeaderValue(request.headers, "x-dev-user-id");
  const parsedRole = userRoleSchema.safeParse(roleHeader);

  if (!parsedRole.success || !userIdHeader) {
    return undefined;
  }

  const verificationStatusHeader = readHeaderValue(
    request.headers,
    "x-dev-verification-status",
  );

  const parsed = authPrincipalSchema.safeParse({
    sub: userIdHeader,
    role: parsedRole.data,
    email: readHeaderValue(request.headers, "x-dev-user-email"),
    clinicId: readHeaderValue(request.headers, "x-dev-clinic-id"),
    profileId: readHeaderValue(request.headers, "x-dev-profile-id"),
    onboardingCompleted:
      readHeaderValue(request.headers, "x-dev-onboarding-completed") === "true",
    verificationStatus:
      verificationStatusHeader && verificationStatusHeader.length > 0
        ? verificationStatusHeader
        : undefined,
    displayName: readHeaderValue(request.headers, "x-dev-display-name"),
  });

  return parsed.success ? parsed.data : undefined;
}

function replyWithAuthError(
  reply: FastifyReply,
  statusCode: 401 | 403 | 503,
  code: string,
  message: string,
) {
  return reply.code(statusCode).send({
    code,
    message,
  });
}

export function createAccessControl(): AccessControl {
  const configuration = loadAuthConfiguration();
  const jwks =
    configuration.mode === "strict" &&
    configuration.configured &&
    configuration.jwksUri
      ? createRemoteJWKSet(new URL(configuration.jwksUri))
      : undefined;

  async function authenticateStrictRequest(request: FastifyRequest) {
    if (
      !configuration.configured ||
      !configuration.audience ||
      !configuration.clientId
    ) {
      return undefined;
    }

    const token = parseAuthorizationHeader(
      readHeaderValue(request.headers, "authorization"),
    );

    if (!token || !jwks || !configuration.issuer) {
      return undefined;
    }

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: configuration.issuer,
        audience: configuration.audience,
      });

      return buildAuthPrincipalFromPayload(payload, configuration.clientId);
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        request.log.warn(
          { error: error.message },
          "JWT verification failed for request",
        );
        return undefined;
      }

      throw error;
    }
  }

  return {
    configuration,
    requireAccess(options = {}) {
      return async function accessControlHandler(request, reply) {
        if (!configuration.configured) {
          return replyWithAuthError(
            reply,
            503,
            "AUTH_NOT_CONFIGURED",
            configuration.mode === "development-bypass"
              ? "Development bypass auth is disabled in production."
              : "Gateway auth is not configured. Set AUTH_ISSUER_URL, AUTH_AUDIENCE, and AUTH_CLIENT_ID.",
          );
        }

        const principal =
          configuration.mode === "development-bypass"
            ? buildAuthPrincipalFromDevelopmentHeaders(request)
            : await authenticateStrictRequest(request);

        if (!principal) {
          return replyWithAuthError(
            reply,
            401,
            "AUTH_UNAUTHORIZED",
            configuration.mode === "development-bypass"
              ? "Missing or invalid development auth headers."
              : "Missing or invalid bearer token.",
          );
        }

        if (options.roles && !options.roles.includes(principal.role)) {
          return replyWithAuthError(
            reply,
            403,
            "AUTH_FORBIDDEN",
            "Authenticated actor does not have access to this resource.",
          );
        }

        request.authContext = principal;
      };
    },
  };
}

function getEventBusUrl() {
  return process.env.NATS_URL ?? DEFAULT_NATS_URL;
}

async function getEventBusConnection() {
  if (!natsConnectionPromise) {
    natsConnectionPromise = connect({
      maxReconnectAttempts: -1,
      name: process.env.SERVICE_INSTANCE_NAME ?? "syndeocare-service",
      servers: getEventBusUrl(),
    });
  }

  return natsConnectionPromise;
}

export async function publishDomainEvent(input: {
  name: EventName;
  producer: ServiceName;
  subject: string;
  payload: Record<string, unknown>;
}) {
  const envelope = eventEnvelopeSchema.parse({
    id: crypto.randomUUID(),
    name: input.name,
    occurredAt: new Date().toISOString(),
    payload: input.payload,
    producer: input.producer,
    subject: input.subject,
    version: 1,
  });
  const connection = await getEventBusConnection();

  connection.publish(
    `syndeocare.events.${envelope.name}`,
    eventEnvelopeCodec.encode(envelope),
  );

  return envelope;
}

export async function createServiceApp(options: ServiceBootstrapOptions) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, { origin: true });
  await app.register(swagger, {
    openapi: {
      info: {
        title: `${options.serviceName} API`,
        version: options.version,
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/internal/")) {
      return;
    }

    const configuredToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!configuredToken) {
      return;
    }

    const providedToken = readHeaderValue(
      request.headers,
      INTERNAL_SERVICE_TOKEN_HEADER,
    );

    if (providedToken !== configuredToken) {
      return reply.code(401).send({
        code: "INTERNAL_SERVICE_UNAUTHORIZED",
        message:
          "The internal service token is missing or invalid for this request.",
      });
    }
  });

  app.get("/health", async () => ({
    service: options.serviceName,
    status: "ok",
    version: options.version,
    environment: process.env.NODE_ENV ?? DEFAULT_NODE_ENV,
  }));

  app.get("/ready", async () => ({
    service: options.serviceName,
    ready: true,
  }));

  app.get("/events", async () => ({
    service: options.serviceName,
    events: options.serviceEvents ?? domainEventCatalog[options.serviceName],
  }));

  if (options.register) {
    await options.register(app);
  }

  return app;
}

export async function startService(options: ServiceBootstrapOptions) {
  const app = await createServiceApp(options);
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const host = process.env.HOST ?? DEFAULT_HOST;
  await app.listen({ port, host });
  return app;
}
