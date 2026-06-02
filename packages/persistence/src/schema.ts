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
  "completed",
  "cancelled",
]);

export const compensationUnitEnum = pgEnum("compensation_unit", [
  "hour",
  "day",
  "shift",
  "contract",
]);

export const actors = pgTable(
  "actors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authSubject: text("auth_subject").notNull().unique(),
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
  }),
);

export const schema = {
  actors,
  bookings,
  onboardingRecords,
  compensationUnitEnum,
  professionalProfiles,
  employmentTypeEnum,
  jobListings,
  jobStatusEnum,
  bookingStatusEnum,
  clinicProfiles,
};
