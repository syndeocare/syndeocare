import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { UploadedDocument } from "@repo/contracts";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "clinic",
  "professional",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "not_started",
  "pending_review",
  "approved",
  "rejected",
]);

export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "limited",
  "unavailable",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "temporary_shift",
  "permanent_role",
  "contract",
]);

export const jobStatusEnum = pgEnum("job_status", ["open", "filled", "closed"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "accepted",
  "confirmed",
  "checked_in",
  "checked_out",
  "completed",
  "cancelled",
]);

export const compensationUnitEnum = pgEnum("compensation_unit", [
  "hour",
  "day",
  "shift",
  "contract",
]);

export const adminCatalogKindEnum = pgEnum("admin_catalog_kind", [
  "certification",
  "document_type",
  "job_role",
  "legal_page",
  "specialty",
]);

export const conversationKindEnum = pgEnum("conversation_kind", [
  "admin",
  "standard",
]);

export const actors = pgTable(
  "actors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authSubject: text("auth_subject").notNull().unique(),
    externalUserId: text("external_user_id").unique(),
    role: userRoleEnum("role").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("not_started"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    roleIdx: index("actors_role_idx").on(table.role),
    verificationStatusIdx: index("actors_verification_status_idx").on(
      table.verificationStatus,
    ),
  }),
);

export const onboardingRecords = pgTable("onboarding_records", {
  actorId: uuid("actor_id")
    .primaryKey()
    .references(() => actors.id, { onDelete: "cascade" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  nextAction: text("next_action").notNull(),
  requiredDocuments: text("required_documents").array().notNull().default([]),
  missingDocuments: text("missing_documents").array().notNull().default([]),
  uploadedDocuments: jsonb("uploaded_documents")
    .$type<UploadedDocument[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  rejectionReason: text("rejection_reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const professionalProfiles = pgTable(
  "professional_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .unique()
      .references(() => actors.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    specialty: text("specialty").notNull(),
    headline: text("headline"),
    bio: text("bio"),
    licenseNumber: text("license_number"),
    primaryPhone: text("primary_phone"),
    yearsExperience: integer("years_experience").notNull().default(0),
    languages: text("languages").array().notNull().default([]),
    rating: numeric("rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    availabilityStatus: availabilityStatusEnum("availability_status")
      .notNull()
      .default("unavailable"),
    nextAvailableAt: timestamp("next_available_at", { withTimezone: true }),
    locationRadiusKm: integer("location_radius_km").notNull().default(0),
    city: text("city").notNull(),
    region: text("region").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    profileImageUrl: text("profile_image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    specialtyIdx: index("professional_profiles_specialty_idx").on(
      table.specialty,
    ),
  }),
);

export const clinicProfiles = pgTable(
  "clinic_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .unique()
      .references(() => actors.id, { onDelete: "cascade" }),
    organizationName: text("organization_name").notNull(),
    facilityType: text("facility_type").notNull(),
    description: text("description"),
    contactPhone: text("contact_phone"),
    websiteUrl: text("website_url"),
    services: text("services").array().notNull().default([]),
    city: text("city").notNull(),
    region: text("region").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    openRoles: integer("open_roles").notNull().default(0),
    rating: numeric("rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    cityIdx: index("clinic_profiles_city_idx").on(table.city),
    facilityTypeIdx: index("clinic_profiles_facility_type_idx").on(
      table.facilityType,
    ),
  }),
);

export const jobListings = pgTable(
  "job_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinicProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    specialty: text("specialty").notNull(),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    status: jobStatusEnum("status").notNull().default("open"),
    city: text("city").notNull(),
    region: text("region").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    radiusKm: integer("radius_km"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    compensationAmount: numeric("compensation_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    compensationCurrency: text("compensation_currency").notNull(),
    compensationUnit: compensationUnitEnum("compensation_unit").notNull(),
    verificationRequired: boolean("verification_required")
      .notNull()
      .default(true),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    requirements: text("requirements").array().notNull().default([]),
    languages: text("languages").array().notNull().default([]),
    contactPreference: text("contact_preference").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clinicStatusIdx: index("job_listings_clinic_status_idx").on(
      table.clinicId,
      table.status,
    ),
    cityIdx: index("job_listings_city_idx").on(table.city),
    specialtyIdx: index("job_listings_specialty_idx").on(table.specialty),
    startsAtIdx: index("job_listings_starts_at_idx").on(table.startsAt),
  }),
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobListings.id, { onDelete: "cascade" }),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinicProfiles.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionalProfiles.id, { onDelete: "cascade" }),
    status: bookingStatusEnum("status").notNull().default("requested"),
    notes: text("notes"),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clinicStatusIdx: index("bookings_clinic_status_idx").on(
      table.clinicId,
      table.status,
    ),
    professionalStatusIdx: index("bookings_professional_status_idx").on(
      table.professionalId,
      table.status,
    ),
    jobProfessionalIdx: index("bookings_job_professional_idx").on(
      table.jobId,
      table.professionalId,
    ),
    activeJobProfessionalUniqueIdx: uniqueIndex(
      "bookings_active_job_professional_unique_idx",
    )
      .on(table.jobId, table.professionalId)
      .where(
        sql`${table.status} IN ('requested', 'accepted', 'confirmed', 'checked_in', 'checked_out')`,
      ),
  }),
);

export const userPreferences = pgTable("user_preferences", {
  actorId: uuid("actor_id")
    .primaryKey()
    .references(() => actors.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  theme: text("theme").notNull().default("system"),
  notificationsEmail: boolean("notifications_email").notNull().default(true),
  notificationsPush: boolean("notifications_push").notNull().default(true),
  notificationsInApp: boolean("notifications_in_app").notNull().default(true),
  emailNewJobs: boolean("email_new_jobs").notNull().default(true),
  emailNewMessages: boolean("email_new_messages").notNull().default(true),
  emailBookingUpdates: boolean("email_booking_updates").notNull().default(true),
  emailDigest: text("email_digest").notNull().default("daily"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appNotifications = pgTable(
  "app_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientExternalUserId: text("recipient_external_user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    data: jsonb("data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recipientCreatedIdx: index("app_notifications_recipient_created_idx").on(
      table.recipientExternalUserId,
      table.createdAt,
    ),
  }),
);

export const actorPushTokens = pgTable(
  "actor_push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => actors.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("expo"),
    platform: text("platform").notNull(),
    token: text("token").notNull(),
    deviceId: text("device_id"),
    deviceName: text("device_name"),
    appVersion: text("app_version"),
    lastRegisteredAt: timestamp("last_registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actorIdx: index("actor_push_tokens_actor_idx").on(table.actorId),
    actorProviderPlatformIdx: index(
      "actor_push_tokens_actor_provider_platform_idx",
    ).on(table.actorId, table.provider, table.platform),
    tokenUniqueIdx: uniqueIndex("actor_push_tokens_token_unique_idx").on(
      table.token,
    ),
  }),
);

export const adminCatalogItems = pgTable(
  "admin_catalog_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: adminCatalogKindEnum("kind").notNull(),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    abbreviation: text("abbreviation"),
    description: text("description"),
    content: text("content"),
    slug: text("slug"),
    isActive: boolean("is_active").notNull().default(true),
    isRequired: boolean("is_required").notNull().default(false),
    appliesTo: text("applies_to").notNull().default("both"),
    allowedExtensions: text("allowed_extensions").array().notNull().default([]),
    maxSizeMb: integer("max_size_mb").notNull().default(10),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    kindActiveIdx: index("admin_catalog_items_kind_active_idx").on(
      table.kind,
      table.isActive,
      table.displayOrder,
    ),
    kindNameIdx: index("admin_catalog_items_kind_name_idx").on(
      table.kind,
      table.name,
    ),
  }),
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: conversationKindEnum("kind").notNull().default("standard"),
    adminActorId: uuid("admin_actor_id").references(() => actors.id, {
      onDelete: "cascade",
    }),
    targetActorId: uuid("target_actor_id").references(() => actors.id, {
      onDelete: "cascade",
    }),
    professionalId: uuid("professional_id").references(
      () => professionalProfiles.id,
      { onDelete: "cascade" },
    ),
    clinicId: uuid("clinic_id").references(() => clinicProfiles.id, {
      onDelete: "cascade",
    }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    adminTargetIdx: index("conversations_admin_target_idx").on(
      table.adminActorId,
      table.targetActorId,
    ),
    clinicProfessionalIdx: index("conversations_clinic_professional_idx").on(
      table.clinicId,
      table.professionalId,
    ),
    uniqueStandardClinicProfessionalIdx: uniqueIndex(
      "conversations_standard_clinic_professional_unique_idx",
    )
      .on(table.clinicId, table.professionalId)
      .where(sql`${table.kind} = 'standard'`),
    uniqueAdminTargetIdx: uniqueIndex("conversations_admin_target_unique_idx")
      .on(table.adminActorId, table.targetActorId)
      .where(sql`${table.kind} = 'admin'`),
    lastMessageIdx: index("conversations_last_message_idx").on(
      table.kind,
      table.lastMessageAt,
    ),
  }),
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderActorId: uuid("sender_actor_id")
      .notNull()
      .references(() => actors.id, { onDelete: "cascade" }),
    senderRole: userRoleEnum("sender_role").notNull(),
    content: text("content").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    fileUrl: text("file_url"),
    fileType: text("file_type"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    conversationCreatedIdx: index(
      "conversation_messages_conversation_created_idx",
    ).on(table.conversationId, table.createdAt),
    unreadIdx: index("conversation_messages_unread_idx").on(
      table.conversationId,
      table.isRead,
    ),
  }),
);

export const schema = {
  actors,
  actorPushTokens,
  adminCatalogItems,
  adminCatalogKindEnum,
  appNotifications,
  bookings,
  conversationKindEnum,
  conversationMessages,
  conversations,
  onboardingRecords,
  compensationUnitEnum,
  professionalProfiles,
  employmentTypeEnum,
  jobListings,
  jobStatusEnum,
  bookingStatusEnum,
  clinicProfiles,
  userPreferences,
};
