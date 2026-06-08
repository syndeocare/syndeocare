import { type RouteContract } from "@repo/contracts";

export function buildPlatformApiRouteCatalog(
  basePath: string,
): RouteContract[] {
  const prefix = `/${basePath.replace(/^\/+/, "").replace(/\/+$/, "")}`;

  return [
    {
      method: "GET",
      path: prefix,
      summary: "NestJS platform API metadata",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/health/live`,
      summary: "Liveness probe for the platform API",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/health/ready`,
      summary: "Readiness probe for the platform API",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/profiles`,
      summary: "Browse professional profiles",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/profiles/:profileId`,
      summary: "Read professional profile details",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/clinics`,
      summary: "Browse clinic profiles",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/clinics/:clinicId`,
      summary: "Read clinic profile details",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/jobs`,
      summary: "Browse open job listings",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/jobs/:jobId`,
      summary: "Read job listing details",
      protected: false,
    },
    {
      method: "GET",
      path: `${prefix}/me`,
      summary: "Resolve current actor context from the testing subject header",
      protected: true,
    },
    {
      method: "GET",
      path: `${prefix}/onboarding/status`,
      summary: "Resolve onboarding status from the testing subject header",
      protected: true,
    },
    {
      method: "GET",
      path: `${prefix}/verification/status`,
      summary: "Resolve verification status from the testing subject header",
      protected: true,
    },
    {
      method: "GET",
      path: `${prefix}/bookings`,
      summary: "List bookings visible to the testing subject header",
      protected: true,
    },
    {
      method: "GET",
      path: `${prefix}/bookings/:bookingId`,
      summary: "Read booking details visible to the testing subject header",
      protected: true,
    },
    {
      method: "POST",
      path: `${prefix}/bookings`,
      summary: "Request a booking as the testing subject header",
      protected: true,
    },
  ];
}
