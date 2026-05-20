import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
    city: text("city").notNull(),
    region: text("region").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    openRoles: integer("open_roles").notNull().default(0),
    rating: numeric("rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    cityIdx: index("clinic_profiles_city_idx").on(table.city),
  }),
);

export const schema = {
  actors,
  onboardingRecords,
  professionalProfiles,
  clinicProfiles,
};
