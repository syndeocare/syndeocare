import { z } from "zod";

export const serviceNameSchema = z.enum([
  "api-gateway",
  "identity",
  "profiles",
  "clinics",
  "scheduling",
  "messaging",
  "notifications",
]);

export const eventNameSchema = z.enum([
  "identity.user.registered",
  "identity.user.authenticated",
  "profiles.profile.created",
  "clinics.clinic.created",
  "scheduling.shift.posted",
  "scheduling.booking.requested",
  "scheduling.booking.confirmed",
  "messaging.message.sent",
  "notifications.notification.requested",
  "notifications.notification.delivered",
]);

export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  name: eventNameSchema,
  producer: serviceNameSchema,
  occurredAt: z.string().datetime(),
  subject: z.string(),
  version: z.literal(1),
  payload: z.record(z.string(), z.unknown()),
});

export const userRoleSchema = z.enum(["admin", "clinic", "professional"]);
export const verificationStatusSchema = z.enum([
  "not_started",
  "pending_review",
  "approved",
  "rejected",
]);
export const availabilityStatusSchema = z.enum([
  "available",
  "limited",
  "unavailable",
]);
export const employmentTypeSchema = z.enum([
  "temporary_shift",
  "permanent_role",
  "contract",
]);
export const jobStatusSchema = z.enum(["open", "filled", "closed"]);
export const bookingStatusSchema = z.enum([
  "requested",
  "accepted",
  "confirmed",
  "completed",
  "cancelled",
]);
export const platformSurfaceSchema = z.enum([
  "admin-web",
  "clinic-web",
  "clinic-mobile",
  "professional-mobile",
]);
export const compensationUnitSchema = z.enum([
  "hour",
  "day",
  "shift",
  "contract",
]);
export const gatewayAuthModeSchema = z.enum(["strict", "development-bypass"]);
export const publicRegistrationRoleSchema = z.enum(["clinic", "professional"]);

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.array(z.string()).optional(),
});

export const moneySchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  unit: compensationUnitSchema,
});

export const locationSchema = z.object({
  city: z.string().min(1),
  region: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().positive().optional(),
});

export const authPrincipalSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email().optional(),
  role: userRoleSchema,
  permissions: z.array(z.string()).default([]),
  clinicId: z.string().min(1).optional(),
  profileId: z.string().min(1).optional(),
  onboardingCompleted: z.boolean().default(false),
  verificationStatus: verificationStatusSchema.default("pending_review"),
  displayName: z.string().min(1).optional(),
});

export const gatewayAuthConfigurationSchema = z.object({
  mode: gatewayAuthModeSchema,
  configured: z.boolean(),
  issuer: z.string().url().optional(),
  audience: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  realm: z.string().min(1).optional(),
  jwksUri: z.string().url().optional(),
  developmentHeaders: z.array(z.string()).optional(),
});

export const authSignInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authSignUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: publicRegistrationRoleSchema,
  displayName: z.string().min(1),
});

export const authTokenSetSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  tokenType: z.string().min(1),
  expiresIn: z.number().int().positive(),
  refreshExpiresIn: z.number().int().positive().optional(),
  scope: z.string().min(1).optional(),
});

export const authSessionSchema = z.object({
  principal: authPrincipalSchema,
  tokens: authTokenSetSchema,
  isNewUser: z.boolean(),
});

export const notificationEmailRequestSchema = z.object({
  actorSubject: z.string().min(1).optional(),
  html: z.string().min(1),
  subject: z.string().min(1),
  toEmail: z.string().email(),
});

export const notificationDeliveryResponseSchema = z.object({
  accepted: z.boolean(),
  deliveredTo: z.string().email(),
  providerMessageId: z.string().min(1),
});

export const uploadAssetTypeSchema = z.enum([
  "profile-image",
  "verification-document",
]);

export const uploadRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

export const uploadDescriptorSchema = z.object({
  assetType: uploadAssetTypeSchema,
  bucket: z.string().min(1),
  key: z.string().min(1),
  uploadMethod: z.literal("PUT"),
  uploadUrl: z.string().url(),
  uploadHeaders: z.object({
    "content-type": z.string().min(1),
  }),
  expiresIn: z.number().int().positive(),
  assetUrl: z.string().url().optional(),
});

export const uploadedDocumentSchema = z.object({
  documentType: z.string().min(1),
  bucket: z.string().min(1),
  key: z.string().min(1),
  uploadedAt: z.string().datetime(),
});

export const finalizeProfileImageUploadInputSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
});

export const finalizeVerificationDocumentUploadInputSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  documentType: z.string().min(1),
});

export const completeProfileImageUploadResponseSchema = z.object({
  persisted: z.literal(true),
  assetType: z.literal("profile-image"),
  resource: z.enum(["professional-profile", "clinic-profile"]),
  assetUrl: z.string().url(),
});

export const completeVerificationDocumentUploadResponseSchema = z.object({
  persisted: z.literal(true),
  assetType: z.literal("verification-document"),
  resource: z.literal("onboarding"),
  documentType: z.string().min(1),
  outstandingDocuments: z.array(z.string().min(1)),
  uploadedDocuments: z.array(uploadedDocumentSchema),
});

export const routeContractSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  summary: z.string().min(1),
  protected: z.boolean(),
});

export const platformMetadataSchema = z.object({
  message: z.string().min(1),
  apiVersion: z.literal("v1"),
  upstreamServices: z.array(serviceNameSchema),
  productSurfaces: z.array(platformSurfaceSchema),
  auth: gatewayAuthConfigurationSchema,
  routes: z.array(routeContractSchema),
});

export const onboardingStatusSchema = z.object({
  role: userRoleSchema,
  onboardingCompleted: z.boolean(),
  verificationStatus: verificationStatusSchema,
  requiredDocuments: z.array(z.string()),
  missingDocuments: z.array(z.string()),
  uploadedDocuments: z.array(uploadedDocumentSchema),
  nextAction: z.string().min(1),
  submittedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
});

export const verificationStatusResponseSchema = z.object({
  status: verificationStatusSchema,
  submittedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
  rejectionReason: z.string().min(1).optional(),
  outstandingDocuments: z.array(z.string()),
  uploadedDocuments: z.array(uploadedDocumentSchema),
});

export const professionalProfileSummarySchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  specialty: z.string().min(1),
  headline: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  primaryPhone: z.string().min(1).optional(),
  yearsExperience: z.number().int().nonnegative(),
  languages: z.array(z.string().min(2)),
  rating: z.number().min(0).max(5),
  verificationStatus: verificationStatusSchema,
  onboardingCompleted: z.boolean(),
  profileImageUrl: z.string().url().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  availability: z.object({
    status: availabilityStatusSchema,
    nextAvailableAt: z.string().datetime().optional(),
    locationRadiusKm: z.number().positive(),
  }),
});

export const professionalProfileUpdateInputSchema = z.object({
  fullName: z.string().min(1),
  specialty: z.string().min(1),
  headline: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  primaryPhone: z.string().min(1).optional(),
  yearsExperience: z.number().int().nonnegative(),
  languages: z.array(z.string().min(2)).min(1),
  availability: z.object({
    status: availabilityStatusSchema,
    nextAvailableAt: z.string().datetime().optional(),
    locationRadiusKm: z.number().int().positive(),
  }),
  location: z.object({
    city: z.string().min(1),
    region: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const professionalProfileListResponseSchema = z.object({
  items: z.array(professionalProfileSummarySchema),
  total: z.number().int().nonnegative(),
});

export const clinicProfileSummarySchema = z.object({
  id: z.string().min(1),
  organizationName: z.string().min(1),
  facilityType: z.string().min(1),
  description: z.string().min(1).optional(),
  contactPhone: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  services: z.array(z.string().min(1)),
  city: z.string().min(1),
  region: z.string().min(1),
  verificationStatus: verificationStatusSchema,
  onboardingCompleted: z.boolean(),
  logoUrl: z.string().url().optional(),
  openRoles: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
});

export const clinicProfileUpdateInputSchema = z.object({
  organizationName: z.string().min(1),
  facilityType: z.string().min(1),
  description: z.string().min(1).optional(),
  contactPhone: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  services: z.array(z.string().min(1)).default([]),
  location: z.object({
    city: z.string().min(1),
    region: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const clinicProfileListResponseSchema = z.object({
  items: z.array(clinicProfileSummarySchema),
  total: z.number().int().nonnegative(),
});

export const onboardingSubmissionInputSchema = z.object({
  requiredDocuments: z.array(z.string().min(1)),
  missingDocuments: z.array(z.string().min(1)),
  nextAction: z.string().min(1),
  submitForReview: z.boolean().default(false),
});

export const verificationReviewInputSchema = z.object({
  status: z.enum(["pending_review", "approved", "rejected"]),
  outstandingDocuments: z.array(z.string().min(1)),
  nextAction: z.string().min(1),
  rejectionReason: z.string().min(1).optional(),
});

export const jobListingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  specialty: z.string().min(1),
  employmentType: employmentTypeSchema,
  status: jobStatusSchema,
  clinicId: z.string().min(1),
  clinicName: z.string().min(1),
  location: locationSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  compensation: moneySchema,
  verificationRequired: z.boolean(),
  summary: z.string().min(1),
  languages: z.array(z.string().min(2)),
});

export const jobListingDetailSchema = jobListingSchema.extend({
  description: z.string().min(1),
  requirements: z.array(z.string().min(1)),
  contactPreference: z.enum(["in_app_chat", "direct_phone"]),
});

export const jobListingCreateInputSchema = z.object({
  title: z.string().min(1),
  specialty: z.string().min(1),
  employmentType: employmentTypeSchema,
  location: locationSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  compensation: moneySchema,
  verificationRequired: z.boolean(),
  summary: z.string().min(1),
  description: z.string().min(1),
  requirements: z.array(z.string().min(1)).min(1),
  languages: z.array(z.string().min(2)).min(1),
  contactPreference: z.enum(["in_app_chat", "direct_phone"]),
});

export const jobListingListResponseSchema = z.object({
  items: z.array(jobListingSchema),
  total: z.number().int().nonnegative(),
});

export const bookingSummarySchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  jobTitle: z.string().min(1),
  status: bookingStatusSchema,
  clinicId: z.string().min(1),
  clinicName: z.string().min(1),
  professionalId: z.string().min(1),
  professionalName: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  location: locationSchema,
  compensation: moneySchema,
});

export const bookingDetailSchema = bookingSummarySchema.extend({
  requestedAt: z.string().datetime(),
  lastUpdatedAt: z.string().datetime(),
  notes: z.string().min(1).optional(),
});

export const bookingListResponseSchema = z.object({
  items: z.array(bookingSummarySchema),
  total: z.number().int().nonnegative(),
});

export const bookingRequestInputSchema = z.object({
  jobId: z.string().min(1),
  notes: z.string().min(1).optional(),
});

export const initialV1RouteCatalog = [
  {
    method: "GET",
    path: "/v1",
    summary: "Gateway metadata and platform contract overview",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/auth/config",
    summary: "Gateway authentication configuration metadata",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/signin",
    summary: "Authenticate with email and password",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/signup",
    summary: "Create a new professional or clinic account",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/me",
    summary: "Authenticated subject context",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/onboarding/status",
    summary: "Authenticated onboarding progress",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/verification/status",
    summary: "Authenticated verification status",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/profiles",
    summary: "Browse verified professional profiles",
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
    path: "/v1/profiles/me",
    summary: "Current professional profile",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/profiles/me",
    summary: "Update the current professional profile",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/clinics",
    summary: "Browse clinic and facility profiles",
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
    path: "/v1/clinics/me",
    summary: "Current clinic profile",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/clinics/me",
    summary: "Update the current clinic profile",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/onboarding/status",
    summary:
      "Update onboarding document state and optionally submit for review",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/admin/verification/:subject",
    summary: "Review verification for a target actor",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/uploads/profile-image",
    summary: "Create a presigned upload for the current actor profile image",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/uploads/profile-image/complete",
    summary: "Persist the uploaded profile image or clinic logo",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/uploads/verification-document",
    summary: "Create a presigned upload for a verification document",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/uploads/verification-document/complete",
    summary: "Persist an uploaded verification document",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/jobs",
    summary: "Browse open jobs and shifts",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/jobs",
    summary: "Create a new job or shift as an authenticated clinic",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/jobs/:jobId",
    summary: "Read job or shift details",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/bookings",
    summary: "Request a booking for an authenticated professional",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/bookings",
    summary: "List bookings visible to the authenticated actor",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/bookings/:bookingId",
    summary: "Read booking details visible to the authenticated actor",
    protected: true,
  },
] satisfies z.infer<typeof routeContractSchema>[];

export const domainEventCatalog = {
  "api-gateway": ["notifications.notification.requested"] as const,
  identity: [
    "identity.user.registered",
    "identity.user.authenticated",
  ] as const,
  profiles: ["profiles.profile.created"] as const,
  clinics: ["clinics.clinic.created"] as const,
  scheduling: [
    "scheduling.shift.posted",
    "scheduling.booking.requested",
    "scheduling.booking.confirmed",
  ] as const,
  messaging: ["messaging.message.sent"] as const,
  notifications: [
    "notifications.notification.requested",
    "notifications.notification.delivered",
  ] as const,
} satisfies Record<
  z.infer<typeof serviceNameSchema>,
  readonly z.infer<typeof eventNameSchema>[]
>;

export type ServiceName = z.infer<typeof serviceNameSchema>;
export type EventName = z.infer<typeof eventNameSchema>;
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;
export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type AuthPrincipal = z.infer<typeof authPrincipalSchema>;
export type GatewayAuthConfiguration = z.infer<
  typeof gatewayAuthConfigurationSchema
>;
export type PublicRegistrationRole = z.infer<
  typeof publicRegistrationRoleSchema
>;
export type AuthSignInInput = z.infer<typeof authSignInInputSchema>;
export type AuthSignUpInput = z.infer<typeof authSignUpInputSchema>;
export type AuthTokenSet = z.infer<typeof authTokenSetSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type NotificationEmailRequest = z.infer<
  typeof notificationEmailRequestSchema
>;
export type NotificationDeliveryResponse = z.infer<
  typeof notificationDeliveryResponseSchema
>;
export type UploadAssetType = z.infer<typeof uploadAssetTypeSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type UploadDescriptor = z.infer<typeof uploadDescriptorSchema>;
export type UploadedDocument = z.infer<typeof uploadedDocumentSchema>;
export type FinalizeProfileImageUploadInput = z.infer<
  typeof finalizeProfileImageUploadInputSchema
>;
export type FinalizeVerificationDocumentUploadInput = z.infer<
  typeof finalizeVerificationDocumentUploadInputSchema
>;
export type CompleteProfileImageUploadResponse = z.infer<
  typeof completeProfileImageUploadResponseSchema
>;
export type CompleteVerificationDocumentUploadResponse = z.infer<
  typeof completeVerificationDocumentUploadResponseSchema
>;
export type PlatformMetadata = z.infer<typeof platformMetadataSchema>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type VerificationStatusResponse = z.infer<
  typeof verificationStatusResponseSchema
>;
export type ProfessionalProfileSummary = z.infer<
  typeof professionalProfileSummarySchema
>;
export type ProfessionalProfileUpdateInput = z.infer<
  typeof professionalProfileUpdateInputSchema
>;
export type ProfessionalProfileListResponse = z.infer<
  typeof professionalProfileListResponseSchema
>;
export type ClinicProfileSummary = z.infer<typeof clinicProfileSummarySchema>;
export type ClinicProfileUpdateInput = z.infer<
  typeof clinicProfileUpdateInputSchema
>;
export type ClinicProfileListResponse = z.infer<
  typeof clinicProfileListResponseSchema
>;
export type OnboardingSubmissionInput = z.infer<
  typeof onboardingSubmissionInputSchema
>;
export type VerificationReviewInput = z.infer<
  typeof verificationReviewInputSchema
>;
export type JobListing = z.infer<typeof jobListingSchema>;
export type JobListingDetail = z.infer<typeof jobListingDetailSchema>;
export type JobListingCreateInput = z.infer<typeof jobListingCreateInputSchema>;
export type BookingSummary = z.infer<typeof bookingSummarySchema>;
export type BookingDetail = z.infer<typeof bookingDetailSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestInputSchema>;
