import { type RouteContract } from "@repo/contracts";

export const platformApiV1RouteCatalog: RouteContract[] = [
  {
    method: "GET",
    path: "/v1",
    summary: "NestJS platform API metadata",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/health/live",
    summary: "Liveness probe for the platform API",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/health/ready",
    summary: "Readiness probe for the platform API",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/profiles",
    summary: "Browse professional profiles",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/profiles/:profileId",
    summary: "Read professional profile details",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/clinics",
    summary: "Browse clinic profiles",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/clinics/:clinicId",
    summary: "Read clinic profile details",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/jobs",
    summary: "Browse open job listings",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/jobs/:jobId",
    summary: "Read job listing details",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/me",
    summary: "Resolve current actor context from the testing subject header",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/onboarding/status",
    summary: "Resolve onboarding status from the testing subject header",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/verification/status",
    summary: "Resolve verification status from the testing subject header",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/bookings",
    summary: "List bookings visible to the testing subject header",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/bookings/:bookingId",
    summary: "Read booking details visible to the testing subject header",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/bookings",
    summary: "Request a booking as the testing subject header",
    protected: true,
  },
];
