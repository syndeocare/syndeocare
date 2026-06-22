import { BACKEND_CONFIG } from "@/config/backend";

export type GatewayUserRole = "professional" | "clinic" | "admin";
export type GatewayVerificationStatus =
  | "not_started"
  | "pending_review"
  | "approved"
  | "rejected";

type GatewayPrincipal = {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  role: GatewayUserRole;
  permissions: string[];
  clinicId?: string;
  profileId?: string;
  onboardingCompleted: boolean;
  verificationStatus: GatewayVerificationStatus;
  displayName?: string;
  profileImageUrl?: string;
};

type GatewayTokenSet = {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn?: number;
  scope?: string;
};

type GatewayAuthSessionResponse = {
  principal: GatewayPrincipal;
  tokens: GatewayTokenSet;
  isNewUser: boolean;
};

type StoredGatewaySession = GatewayAuthSessionResponse & {
  legacyUserId?: string;
  resolvedAt: number;
};

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: AuthUser;
};

export type GatewayUserPreferences = {
  language: string;
  theme: string;
  notificationsEmail: boolean;
  notificationsPush: boolean;
  notificationsInApp: boolean;
  emailNewJobs: boolean;
  emailNewMessages: boolean;
  emailBookingUpdates: boolean;
  emailDigest: string;
};

class AuthBackendError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const GATEWAY_SESSION_STORAGE_KEY = "syndeocare.gateway.session";
const GATEWAY_OAUTH_STORAGE_KEY = "syndeocare.gateway.oauth";
const REFRESH_SKEW_MS = 60_000;

type PendingGatewayOAuth = {
  codeVerifier: string;
  provider: "google";
  redirectUri: string;
  retryAfterLink?: boolean;
  role?: Extract<GatewayUserRole, "professional" | "clinic">;
  state: string;
};

function getGatewayBaseUrl() {
  return BACKEND_CONFIG.apiGatewayBaseUrl;
}

function canUseGatewayAuth() {
  return Boolean(getGatewayBaseUrl());
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function buildRequestHeaders(headers?: HeadersInit) {
  return {
    accept: "application/json",
    ...(headers ?? {}),
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getGatewayBaseUrl();

  if (!baseUrl) {
    throw new AuthBackendError("API gateway auth is not configured.", 500);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildRequestHeaders(init?.headers),
  });
  const body = (await response.json().catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : `Auth request failed with status ${response.status}.`;
    throw new AuthBackendError(
      message,
      response.status,
      typeof body?.code === "string" ? body.code : undefined,
    );
  }

  return body as T;
}

async function resolveLegacyUserId(principal: GatewayPrincipal) {
  return principal.sub;
}

async function toStoredSession(
  session: GatewayAuthSessionResponse,
): Promise<StoredGatewaySession> {
  return {
    ...session,
    legacyUserId: await resolveLegacyUserId(session.principal),
    resolvedAt: Date.now(),
  };
}

function writeStoredSession(session: StoredGatewaySession) {
  const storage = getStorage();
  storage?.setItem(GATEWAY_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function base64UrlEncode(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateOAuthToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

async function sha256Base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64UrlEncode(new Uint8Array(digest));
}

function getOAuthRedirectUri() {
  if (typeof window === "undefined") {
    throw new AuthBackendError("OAuth is only available in the browser.", 500);
  }

  return `${window.location.origin}/auth/oauth/callback`;
}

function writePendingGatewayOAuth(value: PendingGatewayOAuth) {
  getStorage()?.setItem(GATEWAY_OAUTH_STORAGE_KEY, JSON.stringify(value));
}

function readPendingGatewayOAuth() {
  const raw = getStorage()?.getItem(GATEWAY_OAUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingGatewayOAuth;
  } catch {
    getStorage()?.removeItem(GATEWAY_OAUTH_STORAGE_KEY);
    return null;
  }
}

function clearPendingGatewayOAuth() {
  getStorage()?.removeItem(GATEWAY_OAUTH_STORAGE_KEY);
}

export function clearStoredGatewaySession() {
  const storage = getStorage();
  storage?.removeItem(GATEWAY_SESSION_STORAGE_KEY);
}

export function readStoredGatewaySession() {
  const storage = getStorage();
  const raw = storage?.getItem(GATEWAY_SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredGatewaySession;
  } catch {
    clearStoredGatewaySession();
    return null;
  }
}

function toAuthUser(session: StoredGatewaySession): AuthUser {
  return {
    id: session.legacyUserId ?? session.principal.sub,
    email: session.principal.email,
    user_metadata: {
      authSubject: session.principal.sub,
      avatar_url: session.principal.profileImageUrl,
      clinicId: session.principal.clinicId,
      display_name: session.principal.displayName,
      email_verified: session.principal.emailVerified,
      full_name: session.principal.displayName,
      legacyUserId: session.legacyUserId,
      picture: session.principal.profileImageUrl,
      profileId: session.principal.profileId,
      role: session.principal.role,
    },
  };
}

export function toClientAuthSession(
  session: StoredGatewaySession,
): AuthSession {
  return {
    access_token: session.tokens.accessToken,
    refresh_token: session.tokens.refreshToken,
    expires_at:
      Math.floor(session.resolvedAt / 1000) +
      Math.max(session.tokens.expiresIn, 1),
    expires_in: session.tokens.expiresIn,
    token_type: session.tokens.tokenType,
    user: toAuthUser(session),
  };
}

export function getStoredAccessToken() {
  return readStoredGatewaySession()?.tokens.accessToken;
}

async function validateStoredGatewaySession(session: StoredGatewaySession) {
  const principal = await requestJson<GatewayPrincipal>("/me", {
    headers: {
      Authorization: `Bearer ${session.tokens.accessToken}`,
    },
  });

  return {
    ...session,
    legacyUserId: await resolveLegacyUserId(principal),
    principal,
  };
}

export function getGatewayAuthorizationHeaders(): HeadersInit | undefined {
  const session = readStoredGatewaySession();

  if (!session) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${session.tokens.accessToken}`,
  };
}

export async function signInWithGateway(email: string, password: string) {
  const session = await requestJson<GatewayAuthSessionResponse>(
    "/auth/signin",
    {
      body: JSON.stringify({ email, password }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const stored = await toStoredSession(session);
  writeStoredSession(stored);
  return stored;
}

export async function signUpWithGateway(input: {
  email: string;
  password: string;
  role: Extract<GatewayUserRole, "professional" | "clinic">;
  displayName: string;
}) {
  const session = await requestJson<GatewayAuthSessionResponse>(
    "/auth/signup",
    {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const stored = await toStoredSession(session);
  writeStoredSession(stored);
  return stored;
}

export async function startGoogleOAuthWithGateway(input?: {
  retryAfterLink?: boolean;
  role?: Extract<GatewayUserRole, "professional" | "clinic">;
}) {
  const codeVerifier = generateOAuthToken(64);
  const state = generateOAuthToken(32);
  const redirectUri = getOAuthRedirectUri();
  const pendingOAuth: PendingGatewayOAuth = {
    codeVerifier,
    provider: "google",
    redirectUri,
    retryAfterLink: input?.retryAfterLink,
    role: input?.role,
    state,
  };

  writePendingGatewayOAuth(pendingOAuth);

  const { authorizationUrl } = await requestJson<{
    authorizationUrl: string;
    provider: "google";
  }>("/auth/oauth/google/start", {
    body: JSON.stringify({
      codeChallenge: await sha256Base64Url(codeVerifier),
      provider: "google",
      redirectUri,
      role: input?.role,
      state,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  window.location.assign(authorizationUrl);
}

export async function completeGoogleOAuthWithGateway() {
  if (typeof window === "undefined") {
    throw new AuthBackendError("OAuth is only available in the browser.", 500);
  }

  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  if (error) {
    clearPendingGatewayOAuth();
    throw new AuthBackendError(
      params.get("error_description") ?? "Google sign-in was cancelled.",
      401,
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  const pendingOAuth = readPendingGatewayOAuth();

  if (!code || !state || !pendingOAuth || pendingOAuth.state !== state) {
    clearPendingGatewayOAuth();
    throw new AuthBackendError(
      "Google sign-in could not be verified. Please try again.",
      401,
    );
  }

  const currentSession = readStoredGatewaySession();
  let session: GatewayAuthSessionResponse;

  try {
    session = await requestJson<GatewayAuthSessionResponse>(
      "/auth/oauth/google/callback",
      {
        body: JSON.stringify({
          code,
          codeVerifier: pendingOAuth.codeVerifier,
          linkAccessToken: currentSession?.tokens.accessToken,
          linkRefreshToken: currentSession?.tokens.refreshToken,
          provider: pendingOAuth.provider,
          redirectUri: pendingOAuth.redirectUri,
          role: pendingOAuth.role,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
  } catch (error) {
    if (
      error instanceof AuthBackendError &&
      error.code === "AUTH_OAUTH_ACCOUNT_LINKED_RETRY" &&
      !pendingOAuth.retryAfterLink
    ) {
      clearPendingGatewayOAuth();
      await startGoogleOAuthWithGateway({
        retryAfterLink: true,
        role: pendingOAuth.role,
      });
    }

    throw error;
  }

  clearPendingGatewayOAuth();
  const stored = await toStoredSession(session);
  writeStoredSession(stored);
  window.history.replaceState(null, "", "/auth");
  return stored;
}

export async function refreshStoredGatewaySession() {
  const current = readStoredGatewaySession();

  if (!current?.tokens.refreshToken) {
    clearStoredGatewaySession();
    return null;
  }

  const session = await requestJson<GatewayAuthSessionResponse>(
    "/auth/refresh",
    {
      body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const stored = await toStoredSession(session);
  writeStoredSession(stored);
  return stored;
}

export async function restoreGatewaySession() {
  if (!canUseGatewayAuth()) {
    return null;
  }

  const current = readStoredGatewaySession();

  if (!current) {
    return null;
  }

  const expiresAt = current.resolvedAt + current.tokens.expiresIn * 1000;

  if (expiresAt > Date.now() + REFRESH_SKEW_MS) {
    try {
      const validated = await validateStoredGatewaySession(current);
      writeStoredSession(validated);
      return validated;
    } catch {
      clearStoredGatewaySession();
      return null;
    }
  }

  try {
    const refreshed = await refreshStoredGatewaySession();
    return refreshed ? await validateStoredGatewaySession(refreshed) : null;
  } catch {
    clearStoredGatewaySession();
    return null;
  }
}

export async function logoutGatewaySession(refreshToken?: string) {
  if (!canUseGatewayAuth()) {
    clearStoredGatewaySession();
    return;
  }

  try {
    if (refreshToken) {
      await requestJson("/auth/logout", {
        body: JSON.stringify({ refreshToken }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
    }
  } finally {
    clearStoredGatewaySession();
  }
}

export async function requestPasswordResetEmail(
  email: string,
  redirectUrl: string,
) {
  return requestJson("/auth/password-reset/request", {
    body: JSON.stringify({ email, redirectUrl }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function confirmPasswordReset(token: string, password: string) {
  return requestJson("/auth/password-reset/confirm", {
    body: JSON.stringify({ password, token }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function requestEmailVerification(
  email: string,
  redirectUrl: string,
) {
  return requestJson("/auth/email-verification/request", {
    body: JSON.stringify({ email, redirectUrl }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function requestEmailOtp(email: string) {
  return requestJson("/auth/email-otp/request", {
    body: JSON.stringify({ email }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function confirmEmailOtp(email: string, code: string) {
  return requestJson<{ verified: boolean }>("/auth/email-otp/confirm", {
    body: JSON.stringify({ code, email }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function confirmEmailVerification(token: string) {
  return requestJson("/auth/email-verification/confirm", {
    body: JSON.stringify({ token }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function updateGatewayPassword(
  currentPassword: string,
  password: string,
) {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new AuthBackendError("Please sign in again to continue.", 401);
  }

  return requestJson("/auth/password", {
    body: JSON.stringify({ currentPassword, password }),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    method: "POST",
  });
}

export async function deleteGatewayAccount() {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new AuthBackendError("Please sign in again to continue.", 401);
  }

  return requestJson("/auth/account", {
    headers,
    method: "DELETE",
  });
}

export async function getGatewayPreferences() {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new AuthBackendError("Please sign in again to continue.", 401);
  }

  return requestJson<GatewayUserPreferences>("/preferences/me", {
    headers,
  });
}

export async function updateGatewayPreferences(input: GatewayUserPreferences) {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new AuthBackendError("Please sign in again to continue.", 401);
  }

  return requestJson<GatewayUserPreferences>("/preferences/me", {
    body: JSON.stringify(input),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    method: "PATCH",
  });
}

export async function syncGatewayExternalUserId(externalUserId: string) {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new AuthBackendError("Please sign in again to continue.", 401);
  }

  return requestJson<{ externalUserId: string }>("/me/external-id", {
    body: JSON.stringify({ externalUserId }),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    method: "PATCH",
  });
}

export function isGatewayAuthConfigured() {
  return canUseGatewayAuth();
}
