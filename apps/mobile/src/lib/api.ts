import * as ExpoAuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { API_GATEWAY_BASE_URL } from "../config";
import type {
  ApiList,
  AppNotification,
  AuthSession,
  Booking,
  ChatMediaUploadResult,
  ClinicProfile,
  Conversation,
  Job,
  JobCreateInput,
  Message,
  OnboardingStatus,
  Principal,
  ProfileImageUploadResult,
  ProfessionalProfile,
  TokenSet,
  UploadDescriptor,
  UserRole,
} from "../types";

const SESSION_KEY = "syndeocare.mobile.session";
const SESSION_ACCESS_TOKEN_KEY = `${SESSION_KEY}.access`;
const SESSION_REFRESH_TOKEN_KEY = `${SESSION_KEY}.refresh`;
const SESSION_META_KEY = `${SESSION_KEY}.meta`;
const REFRESH_SKEW_MS = 60_000;
const OAUTH_PROVIDER = "google";
const OAUTH_WEB_CLIENT_ID = "syndeocare-web";
const OAUTH_MOBILE_CLIENT_ID = "syndeocare-mobile";

WebBrowser.maybeCompleteAuthSession();

let refreshPromise: Promise<AuthSession | null> | null = null;

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
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
  const buffer = Crypto.getRandomValues(new Uint8Array(bytes));
  return base64UrlEncode(buffer);
}

async function sha256Base64Url(value: string) {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    value,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getOAuthRedirectUri() {
  if (Platform.OS === "web" && globalThis.location?.origin) {
    return `${globalThis.location.origin}/auth/oauth/callback`;
  }

  return ExpoAuthSession.makeRedirectUri({
    path: "auth/oauth/callback",
    scheme: "syndeocare",
  });
}

function getOAuthClientId() {
  return Platform.OS === "web" ? OAUTH_WEB_CLIENT_ID : OAUTH_MOBILE_CLIENT_ID;
}

function getUrlParams(url: string) {
  const query = url.includes("?") ? url.split("?")[1]?.split("#")[0] : "";
  return new URLSearchParams(query ?? "");
}

function getWebStorage() {
  if (Platform.OS !== "web") return null;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

async function deleteStoredValue(key: string) {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function compactPrincipal(principal: Principal): Principal {
  return {
    clinicId: principal.clinicId,
    displayName: principal.displayName,
    email: principal.email,
    emailVerified: principal.emailVerified,
    onboardingCompleted: principal.onboardingCompleted,
    permissions: [],
    profileId: principal.profileId,
    profileImageUrl: principal.profileImageUrl,
    role: principal.role,
    sub: principal.sub,
    verificationStatus: principal.verificationStatus,
  };
}

async function readStoredSession() {
  const webStorage = getWebStorage();
  if (webStorage) {
    const raw = webStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  }

  const [metaRaw, accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(SESSION_META_KEY),
    SecureStore.getItemAsync(SESSION_ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(SESSION_REFRESH_TOKEN_KEY),
  ]);

  if (metaRaw && accessToken) {
    const meta = JSON.parse(metaRaw) as Omit<AuthSession, "tokens"> & {
      tokens: Omit<TokenSet, "accessToken" | "refreshToken">;
    };

    return {
      ...meta,
      tokens: {
        ...meta.tokens,
        accessToken,
        refreshToken: refreshToken ?? undefined,
      },
    } as AuthSession;
  }

  const legacyRaw = await SecureStore.getItemAsync(SESSION_KEY);
  return legacyRaw ? (JSON.parse(legacyRaw) as AuthSession) : null;
}

async function writeStoredSession(session: AuthSession) {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return;
  }

  const { accessToken, refreshToken, ...tokenMeta } = session.tokens;
  const meta = {
    ...session,
    principal: compactPrincipal(session.principal),
    tokens: tokenMeta,
  };

  await Promise.all([
    SecureStore.setItemAsync(SESSION_META_KEY, JSON.stringify(meta)),
    SecureStore.setItemAsync(SESSION_ACCESS_TOKEN_KEY, accessToken),
    refreshToken
      ? SecureStore.setItemAsync(SESSION_REFRESH_TOKEN_KEY, refreshToken)
      : SecureStore.deleteItemAsync(SESSION_REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
  ]);
}

async function deleteStoredSession() {
  await Promise.all([
    deleteStoredValue(SESSION_KEY),
    deleteStoredValue(SESSION_ACCESS_TOKEN_KEY),
    deleteStoredValue(SESSION_REFRESH_TOKEN_KEY),
    deleteStoredValue(SESSION_META_KEY),
  ]);
}

export async function readSession() {
  try {
    return await readStoredSession();
  } catch {
    await clearSession();
    return null;
  }
}

export async function writeSession(session: Omit<AuthSession, "resolvedAt">) {
  const stored: AuthSession = { ...session, resolvedAt: Date.now() };
  await writeStoredSession(stored);
  return stored;
}

export async function clearSession() {
  await deleteStoredSession();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(
      typeof body?.message === "string"
        ? body.message
        : `Request failed with status ${response.status}.`,
      response.status,
      typeof body?.code === "string" ? body.code : undefined,
    );
  }

  return body as T;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const response = await fetch(`${API_GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
}

export async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
) {
  const session = await restoreSession();
  if (!session) {
    throw new ApiError("Please sign in again to continue.", 401);
  }

  return apiRequest<T>(path, init, session.tokens.accessToken);
}

export async function signIn(email: string, password: string) {
  const session = await apiRequest<Omit<AuthSession, "resolvedAt">>(
    "/auth/signin",
    {
      body: JSON.stringify({ email, password }),
      method: "POST",
    },
  );
  return writeSession(session);
}

export async function signUp(input: {
  displayName: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}) {
  const session = await apiRequest<Omit<AuthSession, "resolvedAt">>(
    "/auth/signup",
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );
  return writeSession(session);
}

export async function signInWithGoogle(input?: {
  retryAfterLink?: boolean;
  role?: Exclude<UserRole, "admin">;
}) {
  const codeVerifier = generateOAuthToken(64);
  const state = generateOAuthToken(32);
  const redirectUri = getOAuthRedirectUri();
  const clientId = getOAuthClientId();

  const { authorizationUrl } = await apiRequest<{
    authorizationUrl: string;
    provider: typeof OAUTH_PROVIDER;
  }>("/auth/oauth/google/start", {
    body: JSON.stringify({
      clientId,
      codeChallenge: await sha256Base64Url(codeVerifier),
      provider: OAUTH_PROVIDER,
      redirectUri,
      role: input?.role,
      state,
    }),
    method: "POST",
  });

  const result = await WebBrowser.openAuthSessionAsync(
    authorizationUrl,
    redirectUri,
  );

  if (result.type !== "success") {
    throw new ApiError("Google sign-in was cancelled.", 401);
  }

  const params = getUrlParams(result.url);
  const error = params.get("error");
  if (error) {
    throw new ApiError(
      params.get("error_description") ?? "Google sign-in was cancelled.",
      401,
    );
  }

  const code = params.get("code");
  const returnedState = params.get("state");
  if (!code || returnedState !== state) {
    throw new ApiError(
      "Google sign-in could not be verified. Please try again.",
      401,
    );
  }

  const currentSession = await readSession();

  try {
    const session = await apiRequest<Omit<AuthSession, "resolvedAt">>(
      "/auth/oauth/google/callback",
      {
        body: JSON.stringify({
          code,
          clientId,
          codeVerifier,
          linkAccessToken: currentSession?.tokens.accessToken,
          linkRefreshToken: currentSession?.tokens.refreshToken,
          provider: OAUTH_PROVIDER,
          redirectUri,
          role: input?.role,
        }),
        method: "POST",
      },
    );
    return writeSession(session);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "AUTH_OAUTH_ACCOUNT_LINKED_RETRY" &&
      !input?.retryAfterLink
    ) {
      return signInWithGoogle({ ...input, retryAfterLink: true });
    }

    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ delivered: boolean }>("/auth/password-reset/request", {
    body: JSON.stringify({
      email,
      redirectUrl: "https://syndeocare.ai/reset-password",
    }),
    method: "POST",
  });
}

export async function requestEmailVerification(email: string) {
  return apiRequest<{ delivered: boolean }>(
    "/auth/email-verification/request",
    {
      body: JSON.stringify({
        email,
        redirectUrl: "https://syndeocare.ai/auth/verify-email",
      }),
      method: "POST",
    },
  );
}

export async function updatePassword(input: {
  currentPassword: string;
  password: string;
}) {
  return authenticatedRequest<{ updated: boolean }>("/auth/password", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function refreshSession() {
  const current = await readSession();
  if (!current?.tokens.refreshToken) {
    await clearSession();
    return null;
  }

  const session = await apiRequest<Omit<AuthSession, "resolvedAt">>(
    "/auth/refresh",
    {
      body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
      method: "POST",
    },
  );
  return writeSession(session);
}

export async function restoreSession() {
  const current = await readSession();
  if (!current) return null;

  const expiresAt = current.resolvedAt + current.tokens.expiresIn * 1000;
  if (expiresAt > Date.now() + REFRESH_SKEW_MS) {
    try {
      const principal = await apiRequest<Principal>(
        "/me",
        {},
        current.tokens.accessToken,
      );
      const validated = { ...current, principal };
      await writeStoredSession(validated);
      return validated;
    } catch {
      await clearSession();
      return null;
    }
  }

  refreshPromise ??= refreshSession().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function logout() {
  const current = await readSession();
  try {
    if (current?.tokens.refreshToken) {
      await apiRequest("/auth/logout", {
        body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
        method: "POST",
      });
    }
  } finally {
    await clearSession();
  }
}

export const getMe = () => authenticatedRequest<Principal>("/me");
export const getOnboardingStatus = () =>
  authenticatedRequest<OnboardingStatus>("/onboarding/status");
export const submitOnboarding = (status: OnboardingStatus) =>
  authenticatedRequest<OnboardingStatus>("/onboarding/status", {
    body: JSON.stringify({
      missingDocuments: status.missingDocuments,
      nextAction: "Submitted for administrator review",
      requiredDocuments: status.requiredDocuments,
      submitForReview: true,
    }),
    method: "PATCH",
  });

export const listJobs = () => apiRequest<ApiList<Job>>("/jobs");
export const createJob = (input: JobCreateInput) =>
  authenticatedRequest<Job>("/jobs", {
    body: JSON.stringify(input),
    method: "POST",
  });
export const createBooking = (jobId: string, notes: string) =>
  authenticatedRequest<Booking>("/bookings", {
    body: JSON.stringify({ jobId, notes: notes.trim() || undefined }),
    method: "POST",
  });
export const listBookings = () =>
  authenticatedRequest<ApiList<Booking>>("/bookings");
export const updateBookingStatus = (
  bookingId: string,
  status: "accepted" | "cancelled" | "confirmed" | "completed",
) =>
  authenticatedRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}`, {
    body: JSON.stringify({ status }),
    method: "PATCH",
  });

export const listConversations = () =>
  authenticatedRequest<ApiList<Conversation>>("/conversations");
export const startConversation = (input: {
  clinicId: string;
  professionalId: string;
}) =>
  authenticatedRequest<Conversation>("/conversations", {
    body: JSON.stringify(input),
    method: "POST",
  });
export const listMessages = (conversationId: string) =>
  authenticatedRequest<ApiList<Message>>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
export const sendMessage = (conversationId: string, content: string) =>
  authenticatedRequest<Message>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      body: JSON.stringify({ content }),
      method: "POST",
    },
  );
export const sendMessageWithAttachment = (
  conversationId: string,
  input: {
    content: string;
    fileName?: string | null;
    fileSize?: number | null;
    fileType?: string | null;
    fileUrl?: string | null;
  },
) =>
  authenticatedRequest<Message>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      body: JSON.stringify(input),
      method: "POST",
    },
  );

export async function uploadChatMedia(asset: {
  mimeType?: string | null;
  name: string;
  size?: number | null;
  uri: string;
}) {
  const contentType = asset.mimeType ?? "application/octet-stream";
  const descriptor = await authenticatedRequest<UploadDescriptor>(
    "/uploads/chat-media",
    {
      body: JSON.stringify({ contentType, fileName: asset.name }),
      method: "POST",
    },
  );

  const blob = await fetch(asset.uri).then((response) => response.blob());
  const uploaded = await fetch(descriptor.uploadUrl, {
    body: blob,
    headers: descriptor.uploadHeaders,
    method: descriptor.uploadMethod,
  });

  if (!uploaded.ok) {
    throw new ApiError(
      "File upload failed. Please try again.",
      uploaded.status,
    );
  }

  const completed = await authenticatedRequest<ChatMediaUploadResult>(
    "/uploads/chat-media/complete",
    {
      body: JSON.stringify({
        bucket: descriptor.bucket,
        key: descriptor.key,
      }),
      method: "POST",
    },
  );

  return {
    ...completed,
    fileName: asset.name,
    fileSize: asset.size ?? null,
    fileType: contentType,
  };
}

export async function uploadProfileImage(asset: {
  mimeType?: string | null;
  name?: string | null;
  uri: string;
}) {
  const contentType = asset.mimeType ?? "image/jpeg";
  const descriptor = await authenticatedRequest<UploadDescriptor>(
    "/uploads/profile-image",
    {
      body: JSON.stringify({
        contentType,
        fileName: asset.name ?? "profile-image.jpg",
      }),
      method: "POST",
    },
  );

  const blob = await fetch(asset.uri).then((response) => response.blob());
  const uploaded = await fetch(descriptor.uploadUrl, {
    body: blob,
    headers: descriptor.uploadHeaders,
    method: descriptor.uploadMethod,
  });

  if (!uploaded.ok) {
    throw new ApiError(
      "Image upload failed. Please try again.",
      uploaded.status,
    );
  }

  return authenticatedRequest<ProfileImageUploadResult>(
    "/uploads/profile-image/complete",
    {
      body: JSON.stringify({
        bucket: descriptor.bucket,
        key: descriptor.key,
      }),
      method: "POST",
    },
  );
}

export const getChatMediaAccessUrl = (
  conversationId: string,
  fileUrl: string,
) =>
  authenticatedRequest<{ expiresIn: number; signedUrl: string }>(
    "/uploads/chat-media/access",
    {
      body: JSON.stringify({ conversationId, fileUrl }),
      method: "POST",
    },
  );

export const listNotifications = () =>
  authenticatedRequest<ApiList<AppNotification>>("/notifications");
export const markAllNotificationsRead = () =>
  authenticatedRequest<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
export const markNotificationRead = (notificationId: string) =>
  authenticatedRequest<AppNotification>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" },
  );
export const deleteNotification = (notificationId: string) =>
  authenticatedRequest<{ deleted: number }>(
    `/notifications/${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
  );

export const getMyProfessionalProfile = () =>
  authenticatedRequest<ProfessionalProfile>("/profiles/me");
export const updateMyProfessionalProfile = (input: unknown) =>
  authenticatedRequest<ProfessionalProfile>("/profiles/me", {
    body: JSON.stringify(input),
    method: "PATCH",
  });
export const getMyClinicProfile = () =>
  authenticatedRequest<ClinicProfile>("/clinics/me");
export const updateMyClinicProfile = (input: unknown) =>
  authenticatedRequest<ClinicProfile>("/clinics/me", {
    body: JSON.stringify(input),
    method: "PATCH",
  });
export const listProfessionals = () =>
  apiRequest<ApiList<ProfessionalProfile>>("/profiles");
