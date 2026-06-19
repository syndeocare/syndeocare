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
  emailVerified: z.boolean().optional(),
  role: userRoleSchema,
  permissions: z.array(z.string()).default([]),
  clinicId: z.string().min(1).optional(),
  profileId: z.string().min(1).optional(),
  onboardingCompleted: z.boolean().default(false),
  verificationStatus: verificationStatusSchema.default("pending_review"),
  displayName: z.string().min(1).optional(),
  profileImageUrl: z.string().url().optional(),
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

export const authOAuthProviderSchema = z.enum(["google"]);

export const authOAuthStartInputSchema = z.object({
  codeChallenge: z.string().min(43),
  provider: authOAuthProviderSchema,
  redirectUri: z.string().url(),
  role: publicRegistrationRoleSchema.optional(),
  state: z.string().min(16),
});

export const authOAuthStartResponseSchema = z.object({
  authorizationUrl: z.string().url(),
  provider: authOAuthProviderSchema,
});

export const authOAuthCallbackInputSchema = z.object({
  code: z.string().min(1),
  codeVerifier: z.string().min(43),
  linkAccessToken: z.string().min(1).optional(),
  linkRefreshToken: z.string().min(1).optional(),
  provider: authOAuthProviderSchema,
  redirectUri: z.string().url(),
  role: publicRegistrationRoleSchema.optional(),
});

export const authRefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authLogoutInputSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authPasswordResetRequestInputSchema = z.object({
  email: z.string().email(),
  redirectUrl: z.string().url(),
});

export const authPasswordResetConfirmInputSchema = z.object({
  password: z.string().min(8),
  token: z.string().min(1),
});

export const authEmailVerificationRequestInputSchema = z.object({
  email: z.string().email(),
  redirectUrl: z.string().url(),
});

export const authEmailVerificationConfirmInputSchema = z.object({
  token: z.string().min(1),
});

export const authEmailOtpRequestInputSchema = z.object({
  email: z.string().email(),
});

export const authEmailOtpConfirmInputSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  email: z.string().email(),
});

export const authPasswordUpdateInputSchema = z.object({
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

export const authLogoutResponseSchema = z.object({
  revoked: z.boolean(),
});

export const authEmailActionResponseSchema = z.object({
  delivered: z.boolean(),
});

export const authEmailVerificationConfirmResponseSchema = z.object({
  verified: z.boolean(),
});

export const authPasswordUpdateResponseSchema = z.object({
  updated: z.boolean(),
});

export const authAccountDeletionResponseSchema = z.object({
  deleted: z.boolean(),
});

export const userPreferencesSchema = z.object({
  language: z.string().min(1),
  theme: z.string().min(1),
  notificationsEmail: z.boolean(),
  notificationsPush: z.boolean(),
  notificationsInApp: z.boolean(),
  emailNewJobs: z.boolean(),
  emailNewMessages: z.boolean(),
  emailBookingUpdates: z.boolean(),
  emailDigest: z.string().min(1),
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

export const appNotificationTypeSchema = z.enum([
  "booking_request",
  "booking_accepted",
  "booking_declined",
  "booking_cancelled",
  "booking_confirmed",
  "booking_checked_in",
  "booking_completed",
  "new_message",
  "verification_update",
  "rating_received",
  "shift_reminder",
  "shift_invitation",
  "invitation_accepted",
  "document_approved",
  "document_rejected",
  "profile_verified",
  "shift_created",
]);

export const appNotificationSchema = z.object({
  id: z.string().uuid(),
  recipientExternalUserId: z.string().min(1),
  type: appNotificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
});

export const appNotificationListResponseSchema = z.object({
  items: z.array(appNotificationSchema),
});

export const createAppNotificationInputSchema = z.object({
  recipientExternalUserId: z.string().min(1),
  type: appNotificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const markAllNotificationsReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export const deleteNotificationsResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});

export const notificationCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export const externalUserIdSyncInputSchema = z.object({
  externalUserId: z.string().min(1),
});

export const externalUserIdSyncResponseSchema = z.object({
  externalUserId: z.string().min(1),
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

export const documentAccessRequestSchema = z.object({
  fileUrl: z.string().min(1),
});

export const documentAccessResponseSchema = z.object({
  signedUrl: z.string().url(),
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
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
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
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
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

const legacyVerificationStatusSchema = z.enum([
  "pending",
  "verified",
  "rejected",
]);

export const adminVerificationProfileSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  verification_status: legacyVerificationStatusSchema,
  onboarding_completed: z.boolean(),
  created_at: z.string().datetime(),
  specialties: z.array(z.string()).nullable().optional(),
  qualifications: z.array(z.string()).nullable().optional(),
});

export const adminVerificationClinicSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  verification_status: legacyVerificationStatusSchema,
  onboarding_completed: z.boolean(),
  created_at: z.string().datetime(),
  address: z.string().nullable(),
});

export const adminVerificationDocumentSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  document_type: z.string().min(1),
  name: z.string().min(1),
  file_url: z.string().min(1),
  status: legacyVerificationStatusSchema,
  rejection_reason: z.string().nullable(),
  created_at: z.string().datetime(),
  user_name: z.string().optional(),
  user_role: z.enum(["professional", "clinic", "unknown"]).optional(),
});

export const adminVerificationSnapshotSchema = z.object({
  professionals: z.array(adminVerificationProfileSchema),
  clinics: z.array(adminVerificationClinicSchema),
  documents: z.array(adminVerificationDocumentSchema),
});

export const adminCatalogKindSchema = z.enum([
  "certification",
  "document_type",
  "job_role",
  "legal_page",
  "specialty",
]);

export const adminCatalogItemSchema = z.object({
  id: z.string().uuid(),
  kind: adminCatalogKindSchema,
  name: z.string().min(1),
  nameAr: z.string().nullable(),
  abbreviation: z.string().nullable(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  slug: z.string().nullable(),
  isActive: z.boolean(),
  isRequired: z.boolean(),
  appliesTo: z.string().min(1),
  allowedExtensions: z.array(z.string()),
  maxSizeMb: z.number().int().positive(),
  displayOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const adminCatalogListResponseSchema = z.object({
  items: z.array(adminCatalogItemSchema),
  total: z.number().int().nonnegative(),
});

export const adminCatalogItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  kind: adminCatalogKindSchema,
  name: z.string().min(1),
  nameAr: z.string().nullable().optional(),
  abbreviation: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  appliesTo: z.string().min(1).optional(),
  allowedExtensions: z.array(z.string()).optional(),
  maxSizeMb: z.number().int().positive().optional(),
  displayOrder: z.number().int().optional(),
});

export const adminCatalogDeleteResponseSchema = z.object({
  deleted: z.boolean(),
});

export const conversationKindSchema = z.enum(["admin", "standard"]);

export const conversationSummarySchema = z.object({
  id: z.string().uuid(),
  kind: conversationKindSchema,
  displayName: z.string().min(1),
  counterpartRole: userRoleSchema,
  lastMessageAt: z.string().datetime(),
});

export const conversationListResponseSchema = z.object({
  items: z.array(conversationSummarySchema),
  total: z.number().int().nonnegative(),
});

export const conversationMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderActorId: z.string().uuid(),
  senderRole: userRoleSchema,
  content: z.string(),
  isRead: z.boolean(),
  fileUrl: z.string().nullable(),
  fileType: z.string().nullable(),
  fileName: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});

export const conversationMessageListResponseSchema = z.object({
  items: z.array(conversationMessageSchema),
  total: z.number().int().nonnegative(),
});

export const adminConversationStartInputSchema = z.object({
  targetSubject: z.string().min(1),
});

export const conversationMessageSendInputSchema = z.object({
  content: z.string().min(1),
  fileUrl: z.string().nullable().optional(),
  fileType: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
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

export const bookingStatusUpdateInputSchema = z.object({
  status: z.enum(["accepted", "cancelled", "confirmed", "completed"]),
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
    method: "POST",
    path: "/v1/auth/oauth/google/start",
    summary: "Create a Google OAuth authorization URL",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/oauth/google/callback",
    summary: "Exchange a Google OAuth callback for a platform session",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/refresh",
    summary: "Refresh an authenticated session using a refresh token",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/logout",
    summary: "Revoke a refresh token and terminate the session",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/password-reset/request",
    summary: "Send a password reset link to the account email",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/password-reset/confirm",
    summary: "Complete a password reset using a signed reset token",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/email-verification/request",
    summary: "Send a verification link to the account email",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/email-verification/confirm",
    summary: "Confirm an email verification token",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/email-otp/request",
    summary: "Send a six-digit email verification code",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/email-otp/confirm",
    summary: "Confirm a six-digit email verification code",
    protected: false,
  },
  {
    method: "POST",
    path: "/v1/auth/password",
    summary: "Update the authenticated actor password",
    protected: true,
  },
  {
    method: "DELETE",
    path: "/v1/auth/account",
    summary: "Delete the authenticated actor account",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/preferences/me",
    summary: "Read the authenticated actor preferences",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/preferences/me",
    summary: "Update the authenticated actor preferences",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/me",
    summary: "Authenticated subject context",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/me/external-id",
    summary: "Sync the authenticated actor external user id",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/notifications",
    summary: "List notifications for the authenticated actor",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/notifications",
    summary: "Create an in-app notification for a target external user id",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/notifications/read-all",
    summary: "Mark all notifications as read for the authenticated actor",
    protected: true,
  },
  {
    method: "PATCH",
    path: "/v1/notifications/:notificationId/read",
    summary: "Mark one notification as read for the authenticated actor",
    protected: true,
  },
  {
    method: "DELETE",
    path: "/v1/notifications",
    summary: "Delete all notifications for the authenticated actor",
    protected: true,
  },
  {
    method: "DELETE",
    path: "/v1/notifications/:notificationId",
    summary: "Delete one notification for the authenticated actor",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/admin/notifications/:externalUserId/count",
    summary: "Read notification count for a target external user id",
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
    method: "GET",
    path: "/v1/catalog",
    summary: "List active platform catalog items",
    protected: false,
  },
  {
    method: "GET",
    path: "/v1/admin/verification",
    summary: "List verification documents and actors for admin review",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/admin/catalog",
    summary: "List admin-managed platform catalog items",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/admin/catalog",
    summary: "Create or update an admin-managed platform catalog item",
    protected: true,
  },
  {
    method: "DELETE",
    path: "/v1/admin/catalog/:id",
    summary: "Delete an admin-managed platform catalog item",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/admin/conversations",
    summary: "Start or open an admin conversation with a platform actor",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/conversations",
    summary: "List conversations visible to the authenticated actor",
    protected: true,
  },
  {
    method: "GET",
    path: "/v1/conversations/:conversationId/messages",
    summary: "List messages for a visible conversation",
    protected: true,
  },
  {
    method: "POST",
    path: "/v1/conversations/:conversationId/messages",
    summary: "Send a message to a visible conversation",
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
    method: "POST",
    path: "/v1/uploads/verification-document/access",
    summary: "Create a signed access URL for a private verification document",
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
  {
    method: "PATCH",
    path: "/v1/bookings/:bookingId",
    summary: "Update a booking status visible to the authenticated actor",
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
export type AuthOAuthProvider = z.infer<typeof authOAuthProviderSchema>;
export type AuthOAuthStartInput = z.infer<typeof authOAuthStartInputSchema>;
export type AuthOAuthStartResponse = z.infer<
  typeof authOAuthStartResponseSchema
>;
export type AuthOAuthCallbackInput = z.infer<
  typeof authOAuthCallbackInputSchema
>;
export type AuthRefreshInput = z.infer<typeof authRefreshInputSchema>;
export type AuthLogoutInput = z.infer<typeof authLogoutInputSchema>;
export type AuthPasswordResetRequestInput = z.infer<
  typeof authPasswordResetRequestInputSchema
>;
export type AuthPasswordResetConfirmInput = z.infer<
  typeof authPasswordResetConfirmInputSchema
>;
export type AuthEmailVerificationRequestInput = z.infer<
  typeof authEmailVerificationRequestInputSchema
>;
export type AuthEmailVerificationConfirmInput = z.infer<
  typeof authEmailVerificationConfirmInputSchema
>;
export type AuthEmailOtpRequestInput = z.infer<
  typeof authEmailOtpRequestInputSchema
>;
export type AuthEmailOtpConfirmInput = z.infer<
  typeof authEmailOtpConfirmInputSchema
>;
export type AuthPasswordUpdateInput = z.infer<
  typeof authPasswordUpdateInputSchema
>;
export type AuthSignUpInput = z.infer<typeof authSignUpInputSchema>;
export type AuthTokenSet = z.infer<typeof authTokenSetSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthLogoutResponse = z.infer<typeof authLogoutResponseSchema>;
export type AuthEmailActionResponse = z.infer<
  typeof authEmailActionResponseSchema
>;
export type AuthEmailVerificationConfirmResponse = z.infer<
  typeof authEmailVerificationConfirmResponseSchema
>;
export type AuthPasswordUpdateResponse = z.infer<
  typeof authPasswordUpdateResponseSchema
>;
export type AuthAccountDeletionResponse = z.infer<
  typeof authAccountDeletionResponseSchema
>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type NotificationEmailRequest = z.infer<
  typeof notificationEmailRequestSchema
>;
export type NotificationDeliveryResponse = z.infer<
  typeof notificationDeliveryResponseSchema
>;
export type AppNotification = z.infer<typeof appNotificationSchema>;
export type AppNotificationListResponse = z.infer<
  typeof appNotificationListResponseSchema
>;
export type CreateAppNotificationInput = z.infer<
  typeof createAppNotificationInputSchema
>;
export type MarkAllNotificationsReadResponse = z.infer<
  typeof markAllNotificationsReadResponseSchema
>;
export type DeleteNotificationsResponse = z.infer<
  typeof deleteNotificationsResponseSchema
>;
export type NotificationCountResponse = z.infer<
  typeof notificationCountResponseSchema
>;
export type ExternalUserIdSyncInput = z.infer<
  typeof externalUserIdSyncInputSchema
>;
export type ExternalUserIdSyncResponse = z.infer<
  typeof externalUserIdSyncResponseSchema
>;
export type UploadAssetType = z.infer<typeof uploadAssetTypeSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type UploadDescriptor = z.infer<typeof uploadDescriptorSchema>;
export type UploadedDocument = z.infer<typeof uploadedDocumentSchema>;
export type RouteContract = z.infer<typeof routeContractSchema>;
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
export type DocumentAccessRequest = z.infer<typeof documentAccessRequestSchema>;
export type DocumentAccessResponse = z.infer<
  typeof documentAccessResponseSchema
>;
export type PlatformMetadata = z.infer<typeof platformMetadataSchema>;
export type JobListingListResponse = z.infer<
  typeof jobListingListResponseSchema
>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type VerificationStatusResponse = z.infer<
  typeof verificationStatusResponseSchema
>;
export type AdminVerificationSnapshot = z.infer<
  typeof adminVerificationSnapshotSchema
>;
export type AdminCatalogKind = z.infer<typeof adminCatalogKindSchema>;
export type AdminCatalogItem = z.infer<typeof adminCatalogItemSchema>;
export type AdminCatalogListResponse = z.infer<
  typeof adminCatalogListResponseSchema
>;
export type AdminCatalogItemInput = z.infer<typeof adminCatalogItemInputSchema>;
export type AdminCatalogDeleteResponse = z.infer<
  typeof adminCatalogDeleteResponseSchema
>;
export type ConversationKind = z.infer<typeof conversationKindSchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type ConversationListResponse = z.infer<
  typeof conversationListResponseSchema
>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationMessageListResponse = z.infer<
  typeof conversationMessageListResponseSchema
>;
export type AdminConversationStartInput = z.infer<
  typeof adminConversationStartInputSchema
>;
export type ConversationMessageSendInput = z.infer<
  typeof conversationMessageSendInputSchema
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
export type BookingStatusUpdateInput = z.infer<
  typeof bookingStatusUpdateInputSchema
>;
