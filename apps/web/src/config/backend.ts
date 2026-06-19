// =====================================================
// BACKEND CONFIGURATION
// =====================================================
// This file centralizes all backend connection settings.
// =====================================================

const trimTrailingSlash = (value: string | undefined) =>
  value?.replace(/\/$/, "");

const getSameOriginBackendUrl = (path: "/platform-api/v1" | "/v1") => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}${path}`;
};

const getProductionApiBackendUrl = (path: "/platform-api/v1" | "/v1") => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const hostname = window.location.hostname.replace(/^www\./, "");

  if (hostname !== "syndeocare.ai") {
    return undefined;
  }

  return `https://api.syndeocare.ai${path}`;
};

const platformApiBaseUrl =
  trimTrailingSlash(
    import.meta.env.VITE_PLATFORM_API_BASE_URL as string | undefined,
  ) ??
  getProductionApiBackendUrl("/platform-api/v1") ??
  getSameOriginBackendUrl("/platform-api/v1");

const apiGatewayBaseUrl =
  trimTrailingSlash(
    import.meta.env.VITE_API_GATEWAY_BASE_URL as string | undefined,
  ) ??
  getProductionApiBackendUrl("/v1") ??
  trimTrailingSlash(
    platformApiBaseUrl?.replace(/\/platform-api\/v1\/?$/, "/v1"),
  ) ??
  getSameOriginBackendUrl("/v1");

export const BACKEND_CONFIG = {
  /**
   * Public Nest platform API root, for example:
   * https://api.example.com/platform-api/v1
   */
  platformApiBaseUrl,

  /**
   * API gateway root, for example:
   * https://api.example.com/v1
   *
   * If omitted, the app derives it from VITE_PLATFORM_API_BASE_URL or falls
   * back to the same origin /v1 gateway used by the EC2 deployment.
   */
  apiGatewayBaseUrl,
} as const;
