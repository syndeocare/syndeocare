import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type {
  AppNotification,
  AdminVerificationSnapshot,
  AuthPrincipal,
  BookingDetail,
  BookingRequestInput,
  BookingStatusUpdateInput,
  ClinicProfileListResponse,
  ClinicProfileSummary,
  ClinicProfileUpdateInput,
  FinalizeProfileImageUploadInput,
  FinalizeVerificationDocumentUploadInput,
  JobListingDetail,
  JobListingCreateInput,
  JobListingUpdateInput,
  OnboardingSubmissionInput,
  OnboardingStatus,
  PublicRegistrationRole,
  PushTokenDeleteInput,
  PushTokenRegistrationInput,
  ProfessionalProfileListResponse,
  ProfessionalProfileUpdateInput,
  ProfessionalProfileSummary,
  UploadedDocument,
  UserPreferences,
  VerificationReviewInput,
  VerificationStatusResponse,
} from "@repo/contracts";
import { getDb } from "./client.js";
import {
  actors,
  actorPushTokens,
  adminCatalogItems,
  bookings,
  clinicProfiles,
  conversationMessages,
  conversations,
  jobListings,
  onboardingRecords,
  professionalProfiles,
  userPreferences,
  appNotifications,
} from "./schema.js";

function numericToNumber(value: string) {
  return Number(value);
}

function buildDefaultDisplayName(subject: string, email?: string) {
  if (email) {
    return email.split("@")[0] ?? subject;
  }

  return subject;
}

function dedupeUploadedDocuments(documents: UploadedDocument[]) {
  const recordsByType = new Map<string, UploadedDocument>();

  for (const document of documents) {
    recordsByType.set(document.documentType, document);
  }

  return Array.from(recordsByType.values()).sort((left, right) =>
    left.documentType.localeCompare(right.documentType),
  );
}

function mapLegacyVerificationStatus(
  status: "not_started" | "pending_review" | "approved" | "rejected",
) {
  switch (status) {
    case "approved":
      return "verified" as const;
    case "rejected":
      return "rejected" as const;
    default:
      return "pending" as const;
  }
}

function resolveOnboardingCompleted(input: {
  actor: Pick<
    typeof actors.$inferSelect,
    "onboardingCompleted" | "role" | "verificationStatus"
  >;
  onboarding?: Pick<
    typeof onboardingRecords.$inferSelect,
    "submittedAt"
  > | null;
}) {
  if (input.actor.role === "admin" || input.actor.onboardingCompleted) {
    return true;
  }

  if (
    input.actor.verificationStatus === "pending_review" ||
    input.actor.verificationStatus === "approved"
  ) {
    return true;
  }

  return (
    input.actor.verificationStatus !== "rejected" &&
    Boolean(input.onboarding?.submittedAt)
  );
}

function mapProfessionalProfileSummary(
  row: {
    actor: typeof actors.$inferSelect;
    onboarding?: typeof onboardingRecords.$inferSelect | null;
    profile: typeof professionalProfiles.$inferSelect;
  },
  options: { redactSensitiveFields?: boolean } = {},
): ProfessionalProfileSummary {
  const redactSensitiveFields = options.redactSensitiveFields ?? false;

  return {
    id: row.profile.id,
    fullName: row.profile.fullName,
    specialty: row.profile.specialty,
    headline: row.profile.headline ?? undefined,
    bio: row.profile.bio ?? undefined,
    licenseNumber: redactSensitiveFields
      ? undefined
      : (row.profile.licenseNumber ?? undefined),
    primaryPhone: redactSensitiveFields
      ? undefined
      : (row.profile.primaryPhone ?? undefined),
    yearsExperience: row.profile.yearsExperience,
    languages: row.profile.languages,
    rating: numericToNumber(row.profile.rating),
    verificationStatus: row.actor.verificationStatus,
    onboardingCompleted: resolveOnboardingCompleted({
      actor: row.actor,
      onboarding: row.onboarding,
    }),
    profileImageUrl: row.profile.profileImageUrl ?? undefined,
    city: row.profile.city,
    region: row.profile.region,
    latitude: numericToNumber(row.profile.latitude),
    longitude: numericToNumber(row.profile.longitude),
    availability: {
      status: row.profile.availabilityStatus,
      nextAvailableAt: row.profile.nextAvailableAt?.toISOString(),
      locationRadiusKm: row.profile.locationRadiusKm,
    },
  };
}

function mapClinicProfileSummary(row: {
  actor: typeof actors.$inferSelect;
  clinic: typeof clinicProfiles.$inferSelect;
  onboarding?: typeof onboardingRecords.$inferSelect | null;
}): ClinicProfileSummary {
  return {
    id: row.clinic.id,
    organizationName: row.clinic.organizationName,
    facilityType: row.clinic.facilityType,
    description: row.clinic.description ?? undefined,
    contactPhone: row.clinic.contactPhone ?? undefined,
    websiteUrl: row.clinic.websiteUrl ?? undefined,
    services: row.clinic.services,
    city: row.clinic.city,
    region: row.clinic.region,
    latitude: numericToNumber(row.clinic.latitude),
    longitude: numericToNumber(row.clinic.longitude),
    verificationStatus: row.actor.verificationStatus,
    onboardingCompleted: resolveOnboardingCompleted({
      actor: row.actor,
      onboarding: row.onboarding,
    }),
    logoUrl: row.clinic.logoUrl ?? undefined,
    openRoles: row.clinic.openRoles,
    rating: numericToNumber(row.clinic.rating),
  };
}

function buildDefaultOnboarding(role: PublicRegistrationRole | "admin") {
  if (role === "clinic") {
    return {
      nextAction:
        "Complete clinic onboarding and upload the required facility documents.",
      requiredDocuments: [
        "trade_license",
        "tax_card",
        "authorized_signatory_id",
      ],
    };
  }

  if (role === "professional") {
    return {
      nextAction:
        "Complete your professional onboarding and upload the required credentials.",
      requiredDocuments: ["license", "government_id", "certifications"],
    };
  }

  return {
    nextAction: "Platform access has been granted.",
    requiredDocuments: [],
  };
}

async function assertPhoneNumberIsUnique(
  phone: string | null | undefined,
  actorId: string,
) {
  const normalized = phone?.trim();

  if (!normalized) {
    return;
  }

  const db = getDb();
  const [professional] = await db
    .select({ id: professionalProfiles.id })
    .from(professionalProfiles)
    .where(
      and(
        eq(professionalProfiles.primaryPhone, normalized),
        ne(professionalProfiles.actorId, actorId),
      ),
    )
    .limit(1);

  if (professional) {
    throw new Error("This phone number is already registered.");
  }

  const [clinic] = await db
    .select({ id: clinicProfiles.id })
    .from(clinicProfiles)
    .where(
      and(
        eq(clinicProfiles.contactPhone, normalized),
        ne(clinicProfiles.actorId, actorId),
      ),
    )
    .limit(1);

  if (clinic) {
    throw new Error("This phone number is already registered.");
  }
}

type ActorAggregate = {
  actor: typeof actors.$inferSelect;
  onboarding: typeof onboardingRecords.$inferSelect | null;
};

async function getActorAggregateBySubject(
  subject: string,
): Promise<ActorAggregate | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      onboarding: onboardingRecords,
    })
    .from(actors)
    .leftJoin(onboardingRecords, eq(onboardingRecords.actorId, actors.id))
    .where(eq(actors.authSubject, subject))
    .limit(1);

  return rows[0] ?? null;
}

export async function getAuthPrincipalBySubject(
  subject: string,
): Promise<AuthPrincipal | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return null;
  }

  const db = getDb();
  const [professionalRow] =
    aggregate.actor.role === "professional"
      ? await db
          .select({
            id: professionalProfiles.id,
            profileImageUrl: professionalProfiles.profileImageUrl,
          })
          .from(professionalProfiles)
          .where(eq(professionalProfiles.actorId, aggregate.actor.id))
          .limit(1)
      : [];
  const [clinicRow] =
    aggregate.actor.role === "clinic"
      ? await db
          .select({ id: clinicProfiles.id, logoUrl: clinicProfiles.logoUrl })
          .from(clinicProfiles)
          .where(eq(clinicProfiles.actorId, aggregate.actor.id))
          .limit(1)
      : [];

  return {
    sub: aggregate.actor.authSubject,
    actorId: aggregate.actor.id,
    email: aggregate.actor.email ?? undefined,
    role: aggregate.actor.role,
    permissions: [],
    clinicId: clinicRow?.id,
    profileId: professionalRow?.id,
    onboardingCompleted: resolveOnboardingCompleted(aggregate),
    verificationStatus: aggregate.actor.verificationStatus,
    displayName: aggregate.actor.displayName ?? undefined,
    profileImageUrl:
      professionalRow?.profileImageUrl ?? clinicRow?.logoUrl ?? undefined,
  };
}

export async function deleteActorBySubject(subject: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(actors)
    .where(eq(actors.authSubject, subject))
    .returning({ id: actors.id });

  return deleted.length > 0;
}

export async function getOnboardingStatusBySubject(
  subject: string,
): Promise<OnboardingStatus | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate?.onboarding) {
    return null;
  }

  return {
    role: aggregate.actor.role,
    onboardingCompleted: resolveOnboardingCompleted(aggregate),
    verificationStatus: aggregate.actor.verificationStatus,
    requiredDocuments: aggregate.onboarding.requiredDocuments,
    missingDocuments: aggregate.onboarding.missingDocuments,
    uploadedDocuments: aggregate.onboarding.uploadedDocuments,
    nextAction: aggregate.onboarding.nextAction,
    submittedAt: aggregate.onboarding.submittedAt?.toISOString(),
    reviewedAt: aggregate.onboarding.reviewedAt?.toISOString(),
  };
}

export async function getVerificationStatusBySubject(
  subject: string,
): Promise<VerificationStatusResponse | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate?.onboarding) {
    return null;
  }

  return {
    status: aggregate.actor.verificationStatus,
    submittedAt: aggregate.onboarding.submittedAt?.toISOString(),
    reviewedAt: aggregate.onboarding.reviewedAt?.toISOString(),
    rejectionReason: aggregate.onboarding.rejectionReason ?? undefined,
    outstandingDocuments: aggregate.onboarding.missingDocuments,
    uploadedDocuments: aggregate.onboarding.uploadedDocuments,
  };
}

export async function getUserPreferencesBySubject(
  subject: string,
): Promise<UserPreferences | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.actorId, aggregate.actor.id))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return {
      language: "en",
      theme: "system",
      notificationsEmail: true,
      notificationsPush: true,
      notificationsInApp: true,
      emailNewJobs: true,
      emailNewMessages: true,
      emailBookingUpdates: true,
      emailDigest: "daily",
    };
  }

  return {
    language: row.language,
    theme: row.theme,
    notificationsEmail: row.notificationsEmail,
    notificationsPush: row.notificationsPush,
    notificationsInApp: row.notificationsInApp,
    emailNewJobs: row.emailNewJobs,
    emailNewMessages: row.emailNewMessages,
    emailBookingUpdates: row.emailBookingUpdates,
    emailDigest: row.emailDigest,
  };
}

export async function updateUserPreferencesBySubject(
  subject: string,
  input: UserPreferences,
): Promise<UserPreferences | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return null;
  }

  const db = getDb();
  await db
    .insert(userPreferences)
    .values({
      actorId: aggregate.actor.id,
      emailBookingUpdates: input.emailBookingUpdates,
      emailDigest: input.emailDigest,
      emailNewJobs: input.emailNewJobs,
      emailNewMessages: input.emailNewMessages,
      language: input.language,
      notificationsEmail: input.notificationsEmail,
      notificationsInApp: input.notificationsInApp,
      notificationsPush: input.notificationsPush,
      theme: input.theme,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.actorId,
      set: {
        emailBookingUpdates: input.emailBookingUpdates,
        emailDigest: input.emailDigest,
        emailNewJobs: input.emailNewJobs,
        emailNewMessages: input.emailNewMessages,
        language: input.language,
        notificationsEmail: input.notificationsEmail,
        notificationsInApp: input.notificationsInApp,
        notificationsPush: input.notificationsPush,
        theme: input.theme,
        updatedAt: new Date(),
      },
    });

  return getUserPreferencesBySubject(subject);
}

export async function syncActorExternalUserIdBySubject(
  subject: string,
  externalUserId: string,
) {
  const db = getDb();
  const now = new Date();

  await db
    .update(actors)
    .set({
      externalUserId,
      updatedAt: now,
    })
    .where(eq(actors.authSubject, subject));

  const rows = await db
    .select({ externalUserId: actors.externalUserId })
    .from(actors)
    .where(eq(actors.authSubject, subject))
    .limit(1);

  return rows[0]?.externalUserId ?? null;
}

export async function getActorExternalUserIdBySubject(subject: string) {
  const db = getDb();
  const rows = await db
    .select({
      authSubject: actors.authSubject,
      externalUserId: actors.externalUserId,
    })
    .from(actors)
    .where(eq(actors.authSubject, subject))
    .limit(1);

  return rows[0]?.externalUserId ?? rows[0]?.authSubject ?? null;
}

function mapAppNotification(
  row: typeof appNotifications.$inferSelect,
): AppNotification {
  return {
    id: row.id,
    recipientExternalUserId: row.recipientExternalUserId,
    type: row.type as AppNotification["type"],
    title: row.title,
    message: row.message,
    data: row.data,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listNotificationsForExternalUserId(
  externalUserId: string,
): Promise<AppNotification[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appNotifications)
    .where(eq(appNotifications.recipientExternalUserId, externalUserId))
    .orderBy(desc(appNotifications.createdAt))
    .limit(50);

  return rows.map(mapAppNotification);
}

export async function countNotificationsForExternalUserId(
  externalUserId: string,
) {
  const db = getDb();
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(appNotifications)
    .where(eq(appNotifications.recipientExternalUserId, externalUserId));

  return row?.count ?? 0;
}

export async function createNotificationForExternalUserId(input: {
  recipientExternalUserId: string;
  type: AppNotification["type"];
  title: string;
  message: string;
  data: Record<string, unknown>;
}): Promise<AppNotification> {
  const db = getDb();
  const rows = await db
    .insert(appNotifications)
    .values({
      recipientExternalUserId: input.recipientExternalUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
    })
    .returning();

  return mapAppNotification(rows[0]!);
}

async function createNotificationForExternalUserIdSafely(
  input: Parameters<typeof createNotificationForExternalUserId>[0],
  context: string,
) {
  try {
    await createNotificationForExternalUserId(input);
  } catch (error) {
    console.warn(`Notification side effect failed during ${context}.`, error);
  }
}

export async function markNotificationReadForExternalUserId(
  externalUserId: string,
  notificationId: string,
) {
  const db = getDb();
  const rows = await db
    .update(appNotifications)
    .set({
      isRead: true,
    })
    .where(
      and(
        eq(appNotifications.id, notificationId),
        eq(appNotifications.recipientExternalUserId, externalUserId),
      ),
    )
    .returning();

  return rows[0] ? mapAppNotification(rows[0]) : null;
}

export async function markAllNotificationsReadForExternalUserId(
  externalUserId: string,
) {
  const db = getDb();
  const result = await db
    .update(appNotifications)
    .set({
      isRead: true,
    })
    .where(
      and(
        eq(appNotifications.recipientExternalUserId, externalUserId),
        eq(appNotifications.isRead, false),
      ),
    );

  return Number(result.rowCount ?? 0);
}

export async function deleteNotificationForExternalUserId(
  externalUserId: string,
  notificationId: string,
) {
  const db = getDb();
  const rows = await db
    .delete(appNotifications)
    .where(
      and(
        eq(appNotifications.id, notificationId),
        eq(appNotifications.recipientExternalUserId, externalUserId),
      ),
    )
    .returning({ id: appNotifications.id });

  return rows.length;
}

export async function deleteAllNotificationsForExternalUserId(
  externalUserId: string,
) {
  const db = getDb();
  const rows = await db
    .delete(appNotifications)
    .where(eq(appNotifications.recipientExternalUserId, externalUserId))
    .returning({ id: appNotifications.id });

  return rows.length;
}

export async function registerPushTokenBySubject(
  subject: string,
  input: PushTokenRegistrationInput,
) {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    throw new Error("Notification recipient could not be resolved.");
  }

  const db = getDb();
  const now = new Date();
  await db
    .insert(actorPushTokens)
    .values({
      actorId: aggregate.actor.id,
      appVersion: input.appVersion,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      lastRegisteredAt: now,
      platform: input.platform,
      provider: input.provider,
      token: input.token,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: actorPushTokens.token,
      set: {
        actorId: aggregate.actor.id,
        appVersion: input.appVersion,
        deviceId: input.deviceId,
        deviceName: input.deviceName,
        lastRegisteredAt: now,
        platform: input.platform,
        provider: input.provider,
        updatedAt: now,
      },
    });

  return { registered: true };
}

export async function deletePushTokensBySubject(
  subject: string,
  input: PushTokenDeleteInput = {},
) {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    throw new Error("Notification recipient could not be resolved.");
  }

  const db = getDb();
  const rows = await db
    .delete(actorPushTokens)
    .where(
      input.token
        ? and(
            eq(actorPushTokens.actorId, aggregate.actor.id),
            eq(actorPushTokens.token, input.token),
          )
        : eq(actorPushTokens.actorId, aggregate.actor.id),
    )
    .returning({ id: actorPushTokens.id });

  return { deleted: rows.length };
}

export async function getProfessionalProfileBySubject(
  subject: string,
): Promise<ProfessionalProfileSummary | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      onboarding: onboardingRecords,
      profile: professionalProfiles,
    })
    .from(actors)
    .innerJoin(
      professionalProfiles,
      eq(professionalProfiles.actorId, actors.id),
    )
    .leftJoin(onboardingRecords, eq(onboardingRecords.actorId, actors.id))
    .where(
      and(eq(actors.authSubject, subject), eq(actors.role, "professional")),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return mapProfessionalProfileSummary(row);
}

export async function getClinicProfileBySubject(
  subject: string,
): Promise<ClinicProfileSummary | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      clinic: clinicProfiles,
      onboarding: onboardingRecords,
    })
    .from(actors)
    .innerJoin(clinicProfiles, eq(clinicProfiles.actorId, actors.id))
    .leftJoin(onboardingRecords, eq(onboardingRecords.actorId, actors.id))
    .where(and(eq(actors.authSubject, subject), eq(actors.role, "clinic")))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return mapClinicProfileSummary(row);
}

export async function getProfessionalProfileById(
  profileId: string,
): Promise<ProfessionalProfileSummary | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      profile: professionalProfiles,
    })
    .from(professionalProfiles)
    .innerJoin(actors, eq(professionalProfiles.actorId, actors.id))
    .where(eq(professionalProfiles.id, profileId))
    .limit(1);
  const row = rows[0];

  return row
    ? mapProfessionalProfileSummary(row, { redactSensitiveFields: true })
    : null;
}

export async function listProfessionalProfiles(
  filters: {
    city?: string;
    language?: string;
    specialty?: string;
    verificationStatus?: AuthPrincipal["verificationStatus"];
  } = {},
): Promise<ProfessionalProfileListResponse> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      profile: professionalProfiles,
    })
    .from(professionalProfiles)
    .innerJoin(actors, eq(professionalProfiles.actorId, actors.id));

  const items = rows
    .filter((row) => {
      if (
        filters.specialty &&
        row.profile.specialty.toLowerCase() !== filters.specialty.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.city &&
        row.profile.city.toLowerCase() !== filters.city.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.language &&
        !row.profile.languages.some(
          (language) =>
            language.toLowerCase() === filters.language?.toLowerCase(),
        )
      ) {
        return false;
      }

      if (
        filters.verificationStatus &&
        row.actor.verificationStatus !== filters.verificationStatus
      ) {
        return false;
      }

      return true;
    })
    .map((row) =>
      mapProfessionalProfileSummary(row, { redactSensitiveFields: true }),
    );

  return {
    items,
    total: items.length,
  };
}

export async function getClinicProfileById(
  clinicId: string,
): Promise<ClinicProfileSummary | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      clinic: clinicProfiles,
    })
    .from(clinicProfiles)
    .innerJoin(actors, eq(clinicProfiles.actorId, actors.id))
    .where(eq(clinicProfiles.id, clinicId))
    .limit(1);
  const row = rows[0];

  return row ? mapClinicProfileSummary(row) : null;
}

export async function listClinicProfiles(
  filters: {
    city?: string;
    facilityType?: string;
    verificationStatus?: AuthPrincipal["verificationStatus"];
  } = {},
): Promise<ClinicProfileListResponse> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      clinic: clinicProfiles,
    })
    .from(clinicProfiles)
    .innerJoin(actors, eq(clinicProfiles.actorId, actors.id));

  const items = rows
    .filter((row) => {
      if (
        filters.facilityType &&
        row.clinic.facilityType.toLowerCase() !==
          filters.facilityType.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.city &&
        row.clinic.city.toLowerCase() !== filters.city.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.verificationStatus &&
        row.actor.verificationStatus !== filters.verificationStatus
      ) {
        return false;
      }

      return true;
    })
    .map(mapClinicProfileSummary);

  return {
    items,
    total: items.length,
  };
}

export async function listAdminVerificationSnapshot(): Promise<AdminVerificationSnapshot> {
  const db = getDb();

  const professionalRows = await db
    .select({
      actor: actors,
      profile: professionalProfiles,
    })
    .from(professionalProfiles)
    .innerJoin(actors, eq(professionalProfiles.actorId, actors.id))
    .orderBy(desc(actors.createdAt));

  const clinicRows = await db
    .select({
      actor: actors,
      clinic: clinicProfiles,
    })
    .from(clinicProfiles)
    .innerJoin(actors, eq(clinicProfiles.actorId, actors.id))
    .orderBy(desc(actors.createdAt));

  const onboardingRows = await db
    .select({
      actor: actors,
      onboarding: onboardingRecords,
    })
    .from(onboardingRecords)
    .innerJoin(actors, eq(onboardingRecords.actorId, actors.id))
    .where(ne(actors.role, "admin"))
    .orderBy(desc(onboardingRecords.updatedAt));

  const professionalNames = new Map(
    professionalRows.map((row) => [
      row.actor.authSubject,
      row.profile.fullName,
    ]),
  );
  const clinicNames = new Map(
    clinicRows.map((row) => [
      row.actor.authSubject,
      row.clinic.organizationName,
    ]),
  );

  const documents = onboardingRows.flatMap((row) => {
    const status = mapLegacyVerificationStatus(row.actor.verificationStatus);
    const userName =
      row.actor.role === "professional"
        ? professionalNames.get(row.actor.authSubject)
        : row.actor.role === "clinic"
          ? clinicNames.get(row.actor.authSubject)
          : undefined;

    return row.onboarding.uploadedDocuments.map((document) => {
      const isOutstanding = row.onboarding.missingDocuments.includes(
        document.documentType,
      );
      const documentStatus: "pending" | "verified" | "rejected" =
        status === "rejected" && isOutstanding
          ? "rejected"
          : status === "verified"
            ? "verified"
            : "pending";

      return {
        id: `${row.actor.authSubject}:${document.documentType}`,
        user_id: row.actor.authSubject,
        document_type: document.documentType,
        name: document.documentType,
        file_url: `s3://${document.bucket}/${document.key}`,
        status: documentStatus,
        rejection_reason:
          documentStatus === "rejected"
            ? (row.onboarding.rejectionReason ?? null)
            : null,
        created_at: document.uploadedAt,
        user_name: userName ?? row.actor.displayName ?? "Unknown",
        user_role:
          row.actor.role === "professional" || row.actor.role === "clinic"
            ? row.actor.role
            : ("unknown" as const),
      };
    });
  });

  return {
    professionals: professionalRows.map((row) => ({
      id: row.profile.id,
      user_id: row.actor.authSubject,
      full_name: row.profile.fullName,
      email:
        row.actor.email ?? `${row.actor.authSubject}@local.syndeocare.invalid`,
      phone: row.profile.primaryPhone,
      verification_status: mapLegacyVerificationStatus(
        row.actor.verificationStatus,
      ),
      onboarding_completed: row.actor.onboardingCompleted,
      created_at: row.actor.createdAt.toISOString(),
      specialties: [row.profile.specialty].filter(Boolean),
      qualifications: row.profile.languages,
    })),
    clinics: clinicRows.map((row) => ({
      id: row.clinic.id,
      user_id: row.actor.authSubject,
      name: row.clinic.organizationName,
      email:
        row.actor.email ?? `${row.actor.authSubject}@local.syndeocare.invalid`,
      phone: row.clinic.contactPhone,
      verification_status: mapLegacyVerificationStatus(
        row.actor.verificationStatus,
      ),
      onboarding_completed: row.actor.onboardingCompleted,
      created_at: row.actor.createdAt.toISOString(),
      address: [row.clinic.city, row.clinic.region].filter(Boolean).join(", "),
    })),
    documents,
  };
}

export async function ensureActorAccount(input: {
  subject: string;
  email?: string;
  displayName?: string;
  profileImageUrl?: string;
  role: PublicRegistrationRole | "admin";
}): Promise<AuthPrincipal> {
  const db = getDb();
  const now = new Date();
  const onboarding = buildDefaultOnboarding(input.role);
  const displayName =
    input.displayName ?? buildDefaultDisplayName(input.subject, input.email);

  await db.transaction(async (tx) => {
    await tx
      .insert(actors)
      .values({
        authSubject: input.subject,
        externalUserId: input.subject,
        role: input.role,
        email: input.email,
        displayName,
        onboardingCompleted: input.role === "admin",
        verificationStatus: input.role === "admin" ? "approved" : "not_started",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: actors.authSubject,
        set: {
          externalUserId: sql`coalesce(${actors.externalUserId}, ${input.subject})`,
          role: input.role,
          email: input.email,
          displayName,
          updatedAt: now,
        },
      });

    const actorRows = await tx
      .select({
        actor: actors,
      })
      .from(actors)
      .where(eq(actors.authSubject, input.subject))
      .limit(1);
    const actor = actorRows[0]?.actor;

    if (!actor) {
      throw new Error("Actor upsert did not return a persisted record.");
    }

    await tx
      .insert(onboardingRecords)
      .values({
        actorId: actor.id,
        nextAction: onboarding.nextAction,
        requiredDocuments: onboarding.requiredDocuments,
        missingDocuments: onboarding.requiredDocuments,
        uploadedDocuments: [],
        updatedAt: now,
      })
      .onConflictDoNothing();

    if (input.role === "professional") {
      await tx
        .insert(professionalProfiles)
        .values({
          actorId: actor.id,
          fullName: displayName,
          specialty: "Pending onboarding",
          headline: "Complete your professional onboarding profile.",
          yearsExperience: 0,
          languages: ["ar"],
          availabilityStatus: "unavailable",
          locationRadiusKm: 1,
          city: "TBD",
          region: "TBD",
          latitude: "0",
          longitude: "0",
          profileImageUrl: input.profileImageUrl,
          updatedAt: now,
        })
        .onConflictDoNothing();

      if (input.profileImageUrl) {
        await tx
          .update(professionalProfiles)
          .set({
            profileImageUrl: sql`coalesce(${professionalProfiles.profileImageUrl}, ${input.profileImageUrl})`,
            updatedAt: now,
          })
          .where(eq(professionalProfiles.actorId, actor.id));
      }
    }

    if (input.role === "clinic") {
      await tx
        .insert(clinicProfiles)
        .values({
          actorId: actor.id,
          organizationName: displayName,
          facilityType: "Pending onboarding",
          description:
            "Complete clinic onboarding to publish roles and shifts.",
          services: [],
          city: "TBD",
          region: "TBD",
          latitude: "0",
          longitude: "0",
          logoUrl: input.profileImageUrl,
          updatedAt: now,
        })
        .onConflictDoNothing();

      if (input.profileImageUrl) {
        await tx
          .update(clinicProfiles)
          .set({
            logoUrl: sql`coalesce(${clinicProfiles.logoUrl}, ${input.profileImageUrl})`,
            updatedAt: now,
          })
          .where(eq(clinicProfiles.actorId, actor.id));
      }
    }
  });

  const actor = await getAuthPrincipalBySubject(input.subject);

  if (!actor) {
    throw new Error("Expected actor account to exist after bootstrap.");
  }

  return actor;
}

export async function updateOnboardingBySubject(
  subject: string,
  input: OnboardingSubmissionInput,
): Promise<OnboardingStatus | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return null;
  }

  const db = getDb();
  const now = new Date();
  const shouldMarkComplete =
    aggregate.actor.onboardingCompleted || input.submitForReview;

  await db.transaction(async (tx) => {
    await tx
      .update(actors)
      .set({
        onboardingCompleted: shouldMarkComplete,
        verificationStatus: input.submitForReview
          ? "pending_review"
          : aggregate.actor.verificationStatus,
        updatedAt: now,
      })
      .where(eq(actors.id, aggregate.actor.id));

    await tx
      .insert(onboardingRecords)
      .values({
        actorId: aggregate.actor.id,
        submittedAt: input.submitForReview
          ? now
          : aggregate.onboarding?.submittedAt,
        reviewedAt: input.submitForReview
          ? null
          : aggregate.onboarding?.reviewedAt,
        nextAction: input.nextAction,
        requiredDocuments: input.requiredDocuments,
        missingDocuments: input.missingDocuments,
        uploadedDocuments: aggregate.onboarding?.uploadedDocuments ?? [],
        rejectionReason: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: onboardingRecords.actorId,
        set: {
          submittedAt: input.submitForReview
            ? now
            : (aggregate.onboarding?.submittedAt ?? null),
          reviewedAt: input.submitForReview
            ? null
            : aggregate.onboarding?.reviewedAt,
          nextAction: input.nextAction,
          requiredDocuments: input.requiredDocuments,
          missingDocuments: input.missingDocuments,
          uploadedDocuments: aggregate.onboarding?.uploadedDocuments ?? [],
          rejectionReason: null,
          updatedAt: now,
        },
      });
  });

  return getOnboardingStatusBySubject(subject);
}

export async function reviewVerificationBySubject(
  subject: string,
  input: VerificationReviewInput,
): Promise<VerificationStatusResponse | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return null;
  }

  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(actors)
      .set({
        onboardingCompleted:
          input.status === "approved" && input.outstandingDocuments.length === 0
            ? true
            : input.status === "rejected"
              ? false
              : aggregate.actor.onboardingCompleted,
        verificationStatus: input.status,
        updatedAt: now,
      })
      .where(eq(actors.id, aggregate.actor.id));

    await tx
      .insert(onboardingRecords)
      .values({
        actorId: aggregate.actor.id,
        submittedAt: aggregate.onboarding?.submittedAt ?? now,
        reviewedAt: now,
        nextAction: input.nextAction,
        requiredDocuments: aggregate.onboarding?.requiredDocuments ?? [],
        missingDocuments: input.outstandingDocuments,
        uploadedDocuments: aggregate.onboarding?.uploadedDocuments ?? [],
        rejectionReason:
          input.status === "rejected" ? (input.rejectionReason ?? null) : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: onboardingRecords.actorId,
        set: {
          reviewedAt: now,
          nextAction: input.nextAction,
          missingDocuments: input.outstandingDocuments,
          uploadedDocuments: aggregate.onboarding?.uploadedDocuments ?? [],
          rejectionReason:
            input.status === "rejected"
              ? (input.rejectionReason ?? null)
              : null,
          updatedAt: now,
        },
      });
  });

  return getVerificationStatusBySubject(subject);
}

export async function updateProfessionalProfileBySubject(
  subject: string,
  input: ProfessionalProfileUpdateInput,
): Promise<ProfessionalProfileSummary | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate || aggregate.actor.role !== "professional") {
    return null;
  }

  const db = getDb();
  const now = new Date();
  await assertPhoneNumberIsUnique(input.primaryPhone, aggregate.actor.id);

  await db.transaction(async (tx) => {
    await tx
      .update(actors)
      .set({
        displayName: input.fullName,
        updatedAt: now,
      })
      .where(eq(actors.id, aggregate.actor.id));

    await tx
      .insert(professionalProfiles)
      .values({
        actorId: aggregate.actor.id,
        fullName: input.fullName,
        specialty: input.specialty,
        headline: input.headline,
        bio: input.bio,
        licenseNumber: input.licenseNumber,
        primaryPhone: input.primaryPhone,
        yearsExperience: input.yearsExperience,
        languages: input.languages,
        availabilityStatus: input.availability.status,
        nextAvailableAt: input.availability.nextAvailableAt
          ? new Date(input.availability.nextAvailableAt)
          : null,
        locationRadiusKm: input.availability.locationRadiusKm,
        city: input.location.city,
        region: input.location.region,
        latitude: String(input.location.latitude),
        longitude: String(input.location.longitude),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: professionalProfiles.actorId,
        set: {
          fullName: input.fullName,
          specialty: input.specialty,
          headline: input.headline,
          bio: input.bio,
          licenseNumber: input.licenseNumber,
          primaryPhone: input.primaryPhone,
          yearsExperience: input.yearsExperience,
          languages: input.languages,
          availabilityStatus: input.availability.status,
          nextAvailableAt: input.availability.nextAvailableAt
            ? new Date(input.availability.nextAvailableAt)
            : null,
          locationRadiusKm: input.availability.locationRadiusKm,
          city: input.location.city,
          region: input.location.region,
          latitude: String(input.location.latitude),
          longitude: String(input.location.longitude),
          updatedAt: now,
        },
      });
  });

  return getProfessionalProfileBySubject(subject);
}

export async function updateClinicProfileBySubject(
  subject: string,
  input: ClinicProfileUpdateInput,
): Promise<ClinicProfileSummary | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate || aggregate.actor.role !== "clinic") {
    return null;
  }

  const db = getDb();
  const now = new Date();
  await assertPhoneNumberIsUnique(input.contactPhone, aggregate.actor.id);

  await db.transaction(async (tx) => {
    await tx
      .update(actors)
      .set({
        displayName: input.organizationName,
        updatedAt: now,
      })
      .where(eq(actors.id, aggregate.actor.id));

    await tx
      .insert(clinicProfiles)
      .values({
        actorId: aggregate.actor.id,
        organizationName: input.organizationName,
        facilityType: input.facilityType,
        description: input.description,
        contactPhone: input.contactPhone,
        websiteUrl: input.websiteUrl,
        services: input.services,
        city: input.location.city,
        region: input.location.region,
        latitude: String(input.location.latitude),
        longitude: String(input.location.longitude),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: clinicProfiles.actorId,
        set: {
          organizationName: input.organizationName,
          facilityType: input.facilityType,
          description: input.description,
          contactPhone: input.contactPhone,
          websiteUrl: input.websiteUrl,
          services: input.services,
          city: input.location.city,
          region: input.location.region,
          latitude: String(input.location.latitude),
          longitude: String(input.location.longitude),
          updatedAt: now,
        },
      });
  });

  return getClinicProfileBySubject(subject);
}

export async function persistProfessionalProfileImageBySubject(
  subject: string,
  input: FinalizeProfileImageUploadInput & { assetUrl: string },
): Promise<ProfessionalProfileSummary | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate || aggregate.actor.role !== "professional") {
    return null;
  }

  const db = getDb();
  const now = new Date();

  await db
    .update(professionalProfiles)
    .set({
      profileImageUrl: input.assetUrl,
      updatedAt: now,
    })
    .where(eq(professionalProfiles.actorId, aggregate.actor.id));

  return getProfessionalProfileBySubject(subject);
}

export async function persistClinicLogoBySubject(
  subject: string,
  input: FinalizeProfileImageUploadInput & { assetUrl: string },
): Promise<ClinicProfileSummary | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate || aggregate.actor.role !== "clinic") {
    return null;
  }

  const db = getDb();
  const now = new Date();

  await db
    .update(clinicProfiles)
    .set({
      logoUrl: input.assetUrl,
      updatedAt: now,
    })
    .where(eq(clinicProfiles.actorId, aggregate.actor.id));

  return getClinicProfileBySubject(subject);
}

export async function persistVerificationDocumentBySubject(
  subject: string,
  input: FinalizeVerificationDocumentUploadInput,
): Promise<OnboardingStatus | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate?.onboarding) {
    return null;
  }

  const db = getDb();
  const now = new Date();
  const uploadedDocuments = dedupeUploadedDocuments([
    ...aggregate.onboarding.uploadedDocuments,
    {
      documentType: input.documentType,
      bucket: input.bucket,
      key: input.key,
      uploadedAt: now.toISOString(),
    },
  ]);
  const missingDocuments = aggregate.onboarding.missingDocuments.filter(
    (documentType) => documentType !== input.documentType,
  );
  const nextAction =
    missingDocuments.length === 0
      ? "All required documents are uploaded. Submit your onboarding for review."
      : aggregate.onboarding.nextAction;

  await db
    .update(onboardingRecords)
    .set({
      uploadedDocuments,
      missingDocuments,
      nextAction,
      updatedAt: now,
    })
    .where(eq(onboardingRecords.actorId, aggregate.actor.id));

  return getOnboardingStatusBySubject(subject);
}

const REDACTED_CLINIC_ID = "redacted-clinic";
const REDACTED_CLINIC_NAME = "Verified Healthcare Facility";

function approximateCoordinate(value: string) {
  return Number(numericToNumber(value).toFixed(2));
}

function mapJobListingDetail(
  row: {
    clinic: typeof clinicProfiles.$inferSelect;
    job: typeof jobListings.$inferSelect;
  },
  options: { redactClinicIdentity?: boolean } = {},
): JobListingDetail {
  const redactClinicIdentity = options.redactClinicIdentity ?? false;

  return {
    id: row.job.id,
    title: row.job.title,
    specialty: row.job.specialty,
    employmentType: row.job.employmentType,
    status: row.job.status,
    clinicId: redactClinicIdentity ? REDACTED_CLINIC_ID : row.clinic.id,
    clinicName: redactClinicIdentity
      ? REDACTED_CLINIC_NAME
      : row.clinic.organizationName,
    location: {
      city: row.job.city,
      region: row.job.region,
      latitude: redactClinicIdentity
        ? approximateCoordinate(row.job.latitude)
        : numericToNumber(row.job.latitude),
      longitude: redactClinicIdentity
        ? approximateCoordinate(row.job.longitude)
        : numericToNumber(row.job.longitude),
      radiusKm: row.job.radiusKm ?? undefined,
    },
    startsAt: row.job.startsAt.toISOString(),
    endsAt: row.job.endsAt?.toISOString(),
    compensation: {
      amount: numericToNumber(row.job.compensationAmount),
      currency: row.job.compensationCurrency,
      unit: row.job.compensationUnit,
    },
    verificationRequired: row.job.verificationRequired,
    summary: row.job.summary,
    languages: row.job.languages,
    description: row.job.description,
    requirements: row.job.requirements,
    contactPreference:
      row.job.contactPreference === "direct_phone"
        ? "direct_phone"
        : "in_app_chat",
  };
}

function mapBookingDetail(row: {
  booking: typeof bookings.$inferSelect;
  clinic: typeof clinicProfiles.$inferSelect;
  job: typeof jobListings.$inferSelect;
  professional: typeof professionalProfiles.$inferSelect;
}): BookingDetail {
  return {
    id: row.booking.id,
    jobId: row.job.id,
    jobTitle: row.job.title,
    status: row.booking.status,
    clinicId: row.clinic.id,
    clinicName: row.clinic.organizationName,
    professionalId: row.professional.id,
    professionalName: row.professional.fullName,
    startsAt: row.job.startsAt.toISOString(),
    endsAt: row.job.endsAt?.toISOString(),
    location: {
      city: row.job.city,
      region: row.job.region,
      latitude: numericToNumber(row.job.latitude),
      longitude: numericToNumber(row.job.longitude),
      radiusKm: row.job.radiusKm ?? undefined,
    },
    compensation: {
      amount: numericToNumber(row.job.compensationAmount),
      currency: row.job.compensationCurrency,
      unit: row.job.compensationUnit,
    },
    requestedAt: row.booking.requestedAt.toISOString(),
    lastUpdatedAt: row.booking.lastUpdatedAt.toISOString(),
    notes: row.booking.notes ?? undefined,
  };
}

export async function listJobListings(
  filters: {
    specialty?: string;
    city?: string;
    employmentType?: JobListingCreateInput["employmentType"];
    verificationRequired?: boolean;
  } = {},
): Promise<JobListingDetail[]> {
  const db = getDb();
  const rows = await db
    .select({
      clinic: clinicProfiles,
      job: jobListings,
    })
    .from(jobListings)
    .innerJoin(clinicProfiles, eq(jobListings.clinicId, clinicProfiles.id))
    .orderBy(desc(jobListings.startsAt));

  return rows
    .filter((row) => {
      if (row.job.status !== "open") {
        return false;
      }

      if (
        filters.specialty &&
        row.job.specialty.toLowerCase() !== filters.specialty.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.city &&
        row.job.city.toLowerCase() !== filters.city.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.employmentType &&
        row.job.employmentType !== filters.employmentType
      ) {
        return false;
      }

      if (
        typeof filters.verificationRequired === "boolean" &&
        row.job.verificationRequired !== filters.verificationRequired
      ) {
        return false;
      }

      return true;
    })
    .map((row) => mapJobListingDetail(row, { redactClinicIdentity: true }));
}

export async function getJobListingById(
  jobId: string,
): Promise<JobListingDetail | null> {
  const db = getDb();
  const rows = await db
    .select({
      clinic: clinicProfiles,
      job: jobListings,
    })
    .from(jobListings)
    .innerJoin(clinicProfiles, eq(jobListings.clinicId, clinicProfiles.id))
    .where(eq(jobListings.id, jobId))
    .limit(1);
  const row = rows[0];

  return row ? mapJobListingDetail(row, { redactClinicIdentity: true }) : null;
}

export async function listJobListingsBySubject(
  subject: string,
): Promise<JobListingDetail[]> {
  const clinic = await getClinicProfileBySubject(subject);

  if (!clinic) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      clinic: clinicProfiles,
      job: jobListings,
    })
    .from(jobListings)
    .innerJoin(clinicProfiles, eq(jobListings.clinicId, clinicProfiles.id))
    .where(eq(jobListings.clinicId, clinic.id))
    .orderBy(desc(jobListings.startsAt));

  return rows.map((row) => mapJobListingDetail(row));
}

export async function createJobListingBySubject(
  subject: string,
  input: JobListingCreateInput,
): Promise<JobListingDetail | null> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate || aggregate.actor.role !== "clinic") {
    return null;
  }

  const clinic = await getClinicProfileBySubject(subject);

  if (!clinic) {
    return null;
  }

  const db = getDb();
  const now = new Date();
  const inserted = await db
    .insert(jobListings)
    .values({
      clinicId: clinic.id,
      title: input.title,
      specialty: input.specialty,
      employmentType: input.employmentType,
      status: "open",
      city: input.location.city,
      region: input.location.region,
      latitude: String(input.location.latitude),
      longitude: String(input.location.longitude),
      radiusKm: input.location.radiusKm ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      compensationAmount: String(input.compensation.amount),
      compensationCurrency: input.compensation.currency,
      compensationUnit: input.compensation.unit,
      verificationRequired: input.verificationRequired,
      summary: input.summary,
      description: input.description,
      requirements: input.requirements,
      languages: input.languages,
      contactPreference: input.contactPreference,
      updatedAt: now,
    })
    .returning({ id: jobListings.id });

  await db
    .update(clinicProfiles)
    .set({
      openRoles: sql`${clinicProfiles.openRoles} + 1`,
      updatedAt: now,
    })
    .where(eq(clinicProfiles.id, clinic.id));

  if (!inserted[0]) {
    return null;
  }

  const rows = await db
    .select({
      clinic: clinicProfiles,
      job: jobListings,
    })
    .from(jobListings)
    .innerJoin(clinicProfiles, eq(jobListings.clinicId, clinicProfiles.id))
    .where(eq(jobListings.id, inserted[0].id))
    .limit(1);

  return rows[0] ? mapJobListingDetail(rows[0]) : null;
}

export async function updateJobListingBySubject(
  subject: string,
  jobId: string,
  input: JobListingUpdateInput,
): Promise<JobListingDetail | null> {
  const clinic = await getClinicProfileBySubject(subject);

  if (!clinic) {
    return null;
  }

  const db = getDb();
  const now = new Date();
  const updates: Partial<typeof jobListings.$inferInsert> = {
    updatedAt: now,
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.specialty !== undefined) updates.specialty = input.specialty;
  if (input.employmentType !== undefined) {
    updates.employmentType = input.employmentType;
  }
  if (input.status !== undefined) updates.status = input.status;
  if (input.location !== undefined) {
    updates.city = input.location.city;
    updates.region = input.location.region;
    updates.latitude = String(input.location.latitude);
    updates.longitude = String(input.location.longitude);
    updates.radiusKm = input.location.radiusKm ?? null;
  }
  if (input.startsAt !== undefined) updates.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) {
    updates.endsAt = input.endsAt ? new Date(input.endsAt) : null;
  }
  if (input.compensation !== undefined) {
    updates.compensationAmount = String(input.compensation.amount);
    updates.compensationCurrency = input.compensation.currency;
    updates.compensationUnit = input.compensation.unit;
  }
  if (input.verificationRequired !== undefined) {
    updates.verificationRequired = input.verificationRequired;
  }
  if (input.summary !== undefined) updates.summary = input.summary;
  if (input.description !== undefined) updates.description = input.description;
  if (input.requirements !== undefined)
    updates.requirements = input.requirements;
  if (input.languages !== undefined) updates.languages = input.languages;
  if (input.contactPreference !== undefined) {
    updates.contactPreference = input.contactPreference;
  }

  const updated = await db
    .update(jobListings)
    .set(updates)
    .where(and(eq(jobListings.id, jobId), eq(jobListings.clinicId, clinic.id)))
    .returning({ id: jobListings.id });

  if (!updated[0]) {
    return null;
  }

  const rows = await db
    .select({
      clinic: clinicProfiles,
      job: jobListings,
    })
    .from(jobListings)
    .innerJoin(clinicProfiles, eq(jobListings.clinicId, clinicProfiles.id))
    .where(eq(jobListings.id, updated[0].id))
    .limit(1);

  return rows[0] ? mapJobListingDetail(rows[0]) : null;
}

export async function listBookingsForSubject(
  subject: string,
): Promise<BookingDetail[]> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return [];
  }

  const [clinic, professional] = await Promise.all([
    aggregate.actor.role === "clinic"
      ? getClinicProfileBySubject(subject)
      : null,
    aggregate.actor.role === "professional"
      ? getProfessionalProfileBySubject(subject)
      : null,
  ]);

  const db = getDb();
  const rows = await db
    .select({
      booking: bookings,
      clinic: clinicProfiles,
      job: jobListings,
      professional: professionalProfiles,
    })
    .from(bookings)
    .innerJoin(jobListings, eq(bookings.jobId, jobListings.id))
    .innerJoin(clinicProfiles, eq(bookings.clinicId, clinicProfiles.id))
    .innerJoin(
      professionalProfiles,
      eq(bookings.professionalId, professionalProfiles.id),
    )
    .orderBy(desc(bookings.requestedAt));

  return rows
    .filter((row) => {
      if (aggregate.actor.role === "admin") {
        return true;
      }

      if (aggregate.actor.role === "clinic") {
        return clinic ? row.booking.clinicId === clinic.id : false;
      }

      return professional
        ? row.booking.professionalId === professional.id
        : false;
    })
    .map(mapBookingDetail);
}

export async function getBookingByIdForSubject(
  subject: string,
  bookingId: string,
): Promise<BookingDetail | null> {
  const bookingsVisibleToActor = await listBookingsForSubject(subject);

  return (
    bookingsVisibleToActor.find((booking) => booking.id === bookingId) ?? null
  );
}

async function findAcceptedBookingTimeConflict(input: {
  professionalId: string;
  excludeBookingId: string;
  startsAt: string;
  endsAt?: string;
}) {
  if (!input.endsAt) return null;

  const db = getDb();
  const [conflict] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(jobListings, eq(bookings.jobId, jobListings.id))
    .where(
      and(
        eq(bookings.professionalId, input.professionalId),
        ne(bookings.id, input.excludeBookingId),
        sql`${bookings.status} in ('accepted', 'confirmed')`,
        sql`${jobListings.startsAt} < ${new Date(input.endsAt)}`,
        sql`coalesce(${jobListings.endsAt}, ${jobListings.startsAt}) > ${new Date(input.startsAt)}`,
      ),
    )
    .limit(1);

  return conflict ?? null;
}

async function cancelOverlappingRequestedBookings(input: {
  professionalId: string;
  excludeBookingId: string;
  startsAt: string;
  endsAt?: string;
  now: Date;
}) {
  if (!input.endsAt) return;

  const db = getDb();
  const overlappingRequests = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(jobListings, eq(bookings.jobId, jobListings.id))
    .where(
      and(
        eq(bookings.professionalId, input.professionalId),
        ne(bookings.id, input.excludeBookingId),
        eq(bookings.status, "requested"),
        sql`${jobListings.startsAt} < ${new Date(input.endsAt)}`,
        sql`coalesce(${jobListings.endsAt}, ${jobListings.startsAt}) > ${new Date(input.startsAt)}`,
      ),
    );

  const bookingIds = overlappingRequests.map((booking) => booking.id);
  if (bookingIds.length === 0) return;

  await db
    .update(bookings)
    .set({
      lastUpdatedAt: input.now,
      status: "cancelled",
    })
    .where(inArray(bookings.id, bookingIds));
}

export async function requestBookingBySubject(
  subject: string,
  input: BookingRequestInput,
): Promise<
  | { ok: true; data: BookingDetail }
  | { ok: false; code: string; message: string; statusCode: 403 | 404 | 409 }
> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate || aggregate.actor.role !== "professional") {
    return {
      ok: false,
      code: "PROFILE_NOT_FOUND",
      message: "No professional profile exists for the authenticated actor.",
      statusCode: 404,
    };
  }

  const [job, professional] = await Promise.all([
    getJobListingById(input.jobId),
    getProfessionalProfileBySubject(subject),
  ]);

  if (!job) {
    return {
      ok: false,
      code: "JOB_NOT_FOUND",
      message: "No open job was found for the requested booking.",
      statusCode: 404,
    };
  }

  if (!professional) {
    return {
      ok: false,
      code: "PROFILE_NOT_FOUND",
      message: "No professional profile exists for the authenticated actor.",
      statusCode: 404,
    };
  }

  if (job.status !== "open") {
    return {
      ok: false,
      code: "JOB_NOT_OPEN",
      message: "This shift is no longer accepting applications.",
      statusCode: 409,
    };
  }

  if (new Date(job.startsAt).getTime() <= Date.now()) {
    return {
      ok: false,
      code: "JOB_ALREADY_STARTED",
      message: "This shift has already started and cannot be requested.",
      statusCode: 409,
    };
  }

  if (
    job.verificationRequired &&
    aggregate.actor.verificationStatus !== "approved"
  ) {
    return {
      ok: false,
      code: "BOOKING_VERIFICATION_REQUIRED",
      message:
        "The professional must be verification-approved before requesting this booking.",
      statusCode: 403,
    };
  }

  const db = getDb();
  const existing = await db
    .select({ booking: bookings })
    .from(bookings)
    .where(
      and(
        eq(bookings.jobId, input.jobId),
        eq(bookings.professionalId, professional.id),
        sql`${bookings.status} in ('requested', 'accepted', 'confirmed')`,
      ),
    )
    .limit(1);

  const existingBooking = existing[0]?.booking;
  if (
    existingBooking &&
    ["requested", "accepted", "confirmed"].includes(existingBooking.status)
  ) {
    const booking = await getBookingByIdForSubject(subject, existingBooking.id);

    if (booking) {
      return { ok: true, data: booking };
    }

    return {
      ok: false,
      code: "BOOKING_ALREADY_EXISTS",
      message:
        "A booking request already exists for this professional and job combination.",
      statusCode: 409,
    };
  }

  const now = new Date();
  const inserted = await db
    .insert(bookings)
    .values({
      jobId: job.id,
      clinicId: job.clinicId,
      professionalId: professional.id,
      status: "requested",
      notes: input.notes ?? null,
      requestedAt: now,
      lastUpdatedAt: now,
    })
    .returning({ id: bookings.id });

  const booking = inserted[0]
    ? await getBookingByIdForSubject(subject, inserted[0].id)
    : null;

  if (!booking) {
    return {
      ok: false,
      code: "BOOKING_CREATE_FAILED",
      message: "The booking request could not be persisted.",
      statusCode: 404,
    };
  }

  const [clinicActor] = await db
    .select({
      authSubject: actors.authSubject,
      externalUserId: actors.externalUserId,
    })
    .from(clinicProfiles)
    .innerJoin(actors, eq(clinicProfiles.actorId, actors.id))
    .where(eq(clinicProfiles.id, job.clinicId))
    .limit(1);
  const clinicNotificationRecipient =
    clinicActor?.externalUserId ?? clinicActor?.authSubject;

  if (clinicNotificationRecipient) {
    await createNotificationForExternalUserIdSafely(
      {
        recipientExternalUserId: clinicNotificationRecipient,
        type: "booking_request",
        title: "New shift application",
        message: `${professional.fullName} applied for "${job.title}".`,
        data: { bookingId: booking.id, jobId: job.id },
      },
      "booking request",
    );
  }

  return { ok: true, data: booking };
}

export async function updateBookingStatusBySubject(
  subject: string,
  bookingId: string,
  input: BookingStatusUpdateInput,
): Promise<
  | { ok: true; data: BookingDetail }
  | { ok: false; code: string; message: string; statusCode: 403 | 404 | 409 }
> {
  const aggregate = await getActorAggregateBySubject(subject);

  if (!aggregate) {
    return {
      ok: false,
      code: "ACTOR_NOT_FOUND",
      message: "No actor exists for the authenticated subject.",
      statusCode: 404,
    };
  }

  const current = await getBookingByIdForSubject(subject, bookingId);

  if (!current) {
    return {
      ok: false,
      code: "BOOKING_NOT_FOUND",
      message: "No booking was found for the requested id.",
      statusCode: 404,
    };
  }

  const role = aggregate.actor.role;
  const clinicCanDecide = role === "clinic" || role === "admin";
  const professionalCanCancel =
    role === "professional" && input.status === "cancelled";

  if (!clinicCanDecide && !professionalCanCancel) {
    return {
      ok: false,
      code: "BOOKING_STATUS_FORBIDDEN",
      message: "This actor cannot update the requested booking status.",
      statusCode: 403,
    };
  }

  if (current.status === "completed" || current.status === "cancelled") {
    return {
      ok: false,
      code: "BOOKING_STATUS_FINAL",
      message: "This booking status can no longer be changed.",
      statusCode: 409,
    };
  }

  if (input.status === "accepted" && current.status !== "requested") {
    return {
      ok: false,
      code: "BOOKING_ACCEPT_INVALID_STATUS",
      message: "Only requested bookings can be accepted.",
      statusCode: 409,
    };
  }

  if (input.status === "accepted") {
    const conflict = await findAcceptedBookingTimeConflict({
      professionalId: current.professionalId,
      excludeBookingId: bookingId,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
    });

    if (conflict) {
      return {
        ok: false,
        code: "BOOKING_SCHEDULE_CONFLICT",
        message:
          "This professional already has an accepted booking during this time slot.",
        statusCode: 409,
      };
    }
  }

  if (
    (input.status === "confirmed" || input.status === "completed") &&
    current.status !== "accepted" &&
    current.status !== "confirmed"
  ) {
    return {
      ok: false,
      code: "BOOKING_PROGRESS_INVALID_STATUS",
      message: "Only accepted bookings can be confirmed or completed.",
      statusCode: 409,
    };
  }

  const now = new Date();
  const db = getDb();

  await db
    .update(bookings)
    .set({
      lastUpdatedAt: now,
      status: input.status,
    })
    .where(eq(bookings.id, bookingId));

  if (input.status === "accepted") {
    await db
      .update(bookings)
      .set({
        lastUpdatedAt: now,
        status: "cancelled",
      })
      .where(
        and(
          eq(bookings.jobId, current.jobId),
          eq(bookings.status, "requested"),
          ne(bookings.id, bookingId),
        ),
      );

    await db
      .update(jobListings)
      .set({
        status: "filled",
        updatedAt: now,
      })
      .where(eq(jobListings.id, current.jobId));

    await cancelOverlappingRequestedBookings({
      professionalId: current.professionalId,
      excludeBookingId: bookingId,
      startsAt: current.startsAt,
      endsAt: current.endsAt,
      now,
    });
  }

  if (
    input.status === "cancelled" &&
    (current.status === "accepted" || current.status === "confirmed")
  ) {
    await db
      .update(jobListings)
      .set({
        status: "open",
        updatedAt: now,
      })
      .where(eq(jobListings.id, current.jobId));
  }

  if (input.status === "completed") {
    await db
      .update(jobListings)
      .set({
        status: "closed",
        updatedAt: now,
      })
      .where(eq(jobListings.id, current.jobId));
  }

  const updated = await getBookingByIdForSubject(subject, bookingId);

  if (!updated) {
    return {
      ok: false,
      code: "BOOKING_UPDATE_FAILED",
      message: "The booking status update could not be read back.",
      statusCode: 404,
    };
  }

  const [professionalActor] = await db
    .select({
      authSubject: actors.authSubject,
      externalUserId: actors.externalUserId,
    })
    .from(professionalProfiles)
    .innerJoin(actors, eq(professionalProfiles.actorId, actors.id))
    .where(eq(professionalProfiles.id, current.professionalId))
    .limit(1);
  const professionalNotificationRecipient =
    professionalActor?.externalUserId ?? professionalActor?.authSubject;

  if (professionalNotificationRecipient) {
    const notificationType =
      input.status === "accepted"
        ? "booking_accepted"
        : input.status === "cancelled"
          ? "booking_cancelled"
          : input.status === "confirmed"
            ? "booking_confirmed"
            : "booking_completed";

    await createNotificationForExternalUserIdSafely(
      {
        recipientExternalUserId: professionalNotificationRecipient,
        type: notificationType,
        title: "Shift application updated",
        message: `Your application for "${current.jobTitle}" is now ${input.status}.`,
        data: { bookingId: updated.id, jobId: updated.jobId },
      },
      "booking status update",
    );
  }

  return { ok: true, data: updated };
}

export type AdminCatalogKind =
  | "certification"
  | "document_type"
  | "job_role"
  | "legal_page"
  | "specialty";

export type AdminCatalogItem = {
  id: string;
  kind: AdminCatalogKind;
  name: string;
  nameAr: string | null;
  abbreviation: string | null;
  description: string | null;
  content: string | null;
  slug: string | null;
  isActive: boolean;
  isRequired: boolean;
  appliesTo: string;
  allowedExtensions: string[];
  maxSizeMb: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

function mapAdminCatalogItem(
  row: typeof adminCatalogItems.$inferSelect,
): AdminCatalogItem {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    nameAr: row.nameAr,
    abbreviation: row.abbreviation,
    description: row.description,
    content: row.content,
    slug: row.slug,
    isActive: row.isActive,
    isRequired: row.isRequired,
    appliesTo: row.appliesTo,
    allowedExtensions: row.allowedExtensions,
    maxSizeMb: row.maxSizeMb,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAdminCatalogItems(input: {
  kind?: AdminCatalogKind;
  includeInactive?: boolean;
}): Promise<AdminCatalogItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(adminCatalogItems)
    .orderBy(adminCatalogItems.displayOrder, adminCatalogItems.name);

  return rows
    .filter((row) => (input.kind ? row.kind === input.kind : true))
    .filter((row) => (input.includeInactive ? true : row.isActive))
    .map(mapAdminCatalogItem);
}

export async function saveAdminCatalogItem(input: {
  id?: string;
  kind: AdminCatalogKind;
  name: string;
  nameAr?: string | null;
  abbreviation?: string | null;
  description?: string | null;
  content?: string | null;
  slug?: string | null;
  isActive?: boolean;
  isRequired?: boolean;
  appliesTo?: string;
  allowedExtensions?: string[];
  maxSizeMb?: number;
  displayOrder?: number;
}): Promise<AdminCatalogItem | null> {
  const db = getDb();
  const now = new Date();

  if (input.id) {
    const [updated] = await db
      .update(adminCatalogItems)
      .set({
        abbreviation: input.abbreviation ?? null,
        allowedExtensions: input.allowedExtensions ?? [],
        appliesTo: input.appliesTo ?? "both",
        content: input.content ?? null,
        description: input.description ?? null,
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
        isRequired: input.isRequired ?? false,
        kind: input.kind,
        maxSizeMb: input.maxSizeMb ?? 10,
        name: input.name,
        nameAr: input.nameAr ?? null,
        slug: input.slug ?? null,
        updatedAt: now,
      })
      .where(eq(adminCatalogItems.id, input.id))
      .returning();

    if (updated) {
      return mapAdminCatalogItem(updated);
    }
  }

  const [inserted] = await db
    .insert(adminCatalogItems)
    .values({
      abbreviation: input.abbreviation ?? null,
      allowedExtensions: input.allowedExtensions ?? [],
      appliesTo: input.appliesTo ?? "both",
      content: input.content ?? null,
      description: input.description ?? null,
      displayOrder: input.displayOrder ?? 0,
      isActive: input.isActive ?? true,
      isRequired: input.isRequired ?? false,
      kind: input.kind,
      maxSizeMb: input.maxSizeMb ?? 10,
      name: input.name,
      nameAr: input.nameAr ?? null,
      slug: input.slug ?? null,
      updatedAt: now,
    })
    .returning();

  return inserted ? mapAdminCatalogItem(inserted) : null;
}

export async function deleteAdminCatalogItem(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(adminCatalogItems)
    .where(eq(adminCatalogItems.id, id))
    .returning({ id: adminCatalogItems.id });

  return deleted.length > 0;
}

type ConversationRow = typeof conversations.$inferSelect;
type ActorRow = typeof actors.$inferSelect;

export type ConversationSummary = {
  id: string;
  kind: "admin" | "standard";
  displayName: string;
  counterpartRole: "admin" | "clinic" | "professional";
  lastMessageAt: string;
  unreadCount?: number;
  lastMessage?: string | null;
  lastFileType?: string | null;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderActorId: string;
  senderRole: "admin" | "clinic" | "professional";
  content: string;
  isRead: boolean;
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
};

function actorDisplayName(actor: ActorRow | undefined) {
  return actor?.displayName ?? actor?.email ?? "SyndeoCare user";
}

async function getActorByAuthSubject(subject: string) {
  const db = getDb();
  const [actor] = await db
    .select()
    .from(actors)
    .where(eq(actors.authSubject, subject))
    .limit(1);

  return actor ?? null;
}

async function getActorBySubjectOrExternalId(subjectOrExternalId: string) {
  const bySubject = await getActorByAuthSubject(subjectOrExternalId);

  if (bySubject) {
    return bySubject;
  }

  const db = getDb();
  const [actor] = await db
    .select()
    .from(actors)
    .where(eq(actors.externalUserId, subjectOrExternalId))
    .limit(1);

  return actor ?? null;
}

async function getActorById(id: string) {
  const db = getDb();
  const [actor] = await db.select().from(actors).where(eq(actors.id, id));
  return actor ?? null;
}

async function getStandardConversationRecipient(
  actor: ActorRow,
  conversation: ConversationRow,
) {
  const db = getDb();

  if (actor.role === "professional" && conversation.clinicId) {
    const [recipient] = await db
      .select({
        actor: actors,
        displayName: clinicProfiles.organizationName,
      })
      .from(clinicProfiles)
      .innerJoin(actors, eq(clinicProfiles.actorId, actors.id))
      .where(eq(clinicProfiles.id, conversation.clinicId))
      .limit(1);

    return recipient ?? null;
  }

  if (actor.role === "clinic" && conversation.professionalId) {
    const [recipient] = await db
      .select({
        actor: actors,
        displayName: professionalProfiles.fullName,
      })
      .from(professionalProfiles)
      .innerJoin(actors, eq(professionalProfiles.actorId, actors.id))
      .where(eq(professionalProfiles.id, conversation.professionalId))
      .limit(1);

    return recipient ?? null;
  }

  return null;
}

async function getConversationMessageRecipient(
  actor: ActorRow,
  conversation: ConversationRow,
) {
  if (conversation.kind === "admin") {
    const recipientActorId =
      actor.id === conversation.adminActorId
        ? conversation.targetActorId
        : conversation.adminActorId;
    const recipient = recipientActorId
      ? await getActorById(recipientActorId)
      : null;

    return recipient
      ? {
          actor: recipient,
          displayName: actorDisplayName(recipient),
        }
      : null;
  }

  return getStandardConversationRecipient(actor, conversation);
}

async function canAccessConversation(
  actor: ActorRow,
  conversation: ConversationRow,
) {
  if (actor.role === "admin") {
    return (
      conversation.adminActorId === actor.id ||
      conversation.targetActorId === actor.id
    );
  }

  if (conversation.kind === "admin") {
    return conversation.targetActorId === actor.id;
  }

  if (actor.role === "professional") {
    const [profile] = await getDb()
      .select({ id: professionalProfiles.id })
      .from(professionalProfiles)
      .where(eq(professionalProfiles.actorId, actor.id));
    return profile?.id === conversation.professionalId;
  }

  const [clinic] = await getDb()
    .select({ id: clinicProfiles.id })
    .from(clinicProfiles)
    .where(eq(clinicProfiles.actorId, actor.id));
  return clinic?.id === conversation.clinicId;
}

export async function startAdminConversationBySubject(
  adminSubject: string,
  targetSubject: string,
): Promise<ConversationSummary | null> {
  const [adminActor, targetActor] = await Promise.all([
    getActorBySubjectOrExternalId(adminSubject),
    getActorBySubjectOrExternalId(targetSubject),
  ]);

  if (!adminActor || adminActor.role !== "admin" || !targetActor) {
    return null;
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.kind, "admin"),
        eq(conversations.adminActorId, adminActor.id),
        eq(conversations.targetActorId, targetActor.id),
      ),
    )
    .limit(1);

  const conversation =
    existing[0] ??
    (
      await db
        .insert(conversations)
        .values({
          adminActorId: adminActor.id,
          kind: "admin",
          targetActorId: targetActor.id,
        })
        .returning()
    )[0];

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    kind: conversation.kind,
    displayName: actorDisplayName(targetActor),
    counterpartRole: targetActor.role,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
  };
}

export async function startStandardConversationBySubject(
  subject: string,
  input: { professionalId: string; clinicId: string },
): Promise<ConversationSummary | null> {
  const actor = await getActorByAuthSubject(subject);

  if (!actor || actor.role === "admin") {
    return null;
  }

  const db = getDb();
  const [[professional], [clinic]] = await Promise.all([
    db
      .select({
        profile: professionalProfiles,
        actor: actors,
      })
      .from(professionalProfiles)
      .innerJoin(actors, eq(professionalProfiles.actorId, actors.id))
      .where(eq(professionalProfiles.id, input.professionalId))
      .limit(1),
    db
      .select({
        clinic: clinicProfiles,
        actor: actors,
      })
      .from(clinicProfiles)
      .innerJoin(actors, eq(clinicProfiles.actorId, actors.id))
      .where(eq(clinicProfiles.id, input.clinicId))
      .limit(1),
  ]);

  if (!professional || !clinic) {
    return null;
  }

  const isProfessionalParticipant =
    actor.role === "professional" && professional.actor.id === actor.id;
  const isClinicParticipant =
    actor.role === "clinic" && clinic.actor.id === actor.id;

  if (!isProfessionalParticipant && !isClinicParticipant) {
    return null;
  }

  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.kind, "standard"),
        eq(conversations.professionalId, input.professionalId),
        eq(conversations.clinicId, input.clinicId),
      ),
    )
    .limit(1);

  if (isProfessionalParticipant && !existing[0]) {
    const allowedBookings = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(
        and(
          eq(bookings.professionalId, input.professionalId),
          eq(bookings.clinicId, input.clinicId),
        ),
      );
    const hasAcceptedRelationship = allowedBookings.some((booking) =>
      ["accepted", "confirmed", "completed"].includes(booking.status),
    );

    if (!hasAcceptedRelationship) {
      return null;
    }
  }

  const conversation =
    existing[0] ??
    (
      await db
        .insert(conversations)
        .values({
          clinicId: input.clinicId,
          kind: "standard",
          professionalId: input.professionalId,
        })
        .returning()
    )[0];

  if (!conversation) {
    return null;
  }

  const counterpart =
    actor.role === "professional" ? clinic.actor : professional.actor;

  return {
    id: conversation.id,
    kind: "standard",
    displayName:
      actor.role === "professional"
        ? clinic.clinic.organizationName
        : professional.profile.fullName,
    counterpartRole: counterpart.role,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
  };
}

export async function listConversationsForSubject(
  subject: string,
): Promise<ConversationSummary[]> {
  const actor = await getActorByAuthSubject(subject);

  if (!actor) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.lastMessageAt));
  const summaries: ConversationSummary[] = [];

  for (const conversation of rows) {
    if (!(await canAccessConversation(actor, conversation))) {
      continue;
    }

    const otherActorId =
      conversation.kind === "admin"
        ? actor.id === conversation.adminActorId
          ? conversation.targetActorId
          : conversation.adminActorId
        : null;
    const otherActor = otherActorId ? await getActorById(otherActorId) : null;
    const standardCounterpart =
      conversation.kind === "standard"
        ? actor.role === "professional" && conversation.clinicId
          ? await getClinicProfileById(conversation.clinicId)
          : actor.role === "clinic" && conversation.professionalId
            ? await getProfessionalProfileById(conversation.professionalId)
            : null
        : null;
    const [unread] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.conversationId, conversation.id),
          ne(conversationMessages.senderActorId, actor.id),
          eq(conversationMessages.isRead, false),
        ),
      );
    const [lastMessage] = await db
      .select({
        content: conversationMessages.content,
        fileType: conversationMessages.fileType,
      })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversation.id))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(1);

    summaries.push({
      id: conversation.id,
      kind: conversation.kind,
      displayName:
        conversation.kind === "admin"
          ? actorDisplayName(otherActor ?? undefined)
          : standardCounterpart
            ? "organizationName" in standardCounterpart
              ? standardCounterpart.organizationName
              : standardCounterpart.fullName
            : "Clinic conversation",
      counterpartRole:
        conversation.kind === "admin"
          ? (otherActor?.role ?? "admin")
          : actor.role === "clinic"
            ? "professional"
            : "clinic",
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unreadCount: unread?.count ?? 0,
      lastMessage: lastMessage?.content ?? null,
      lastFileType: lastMessage?.fileType ?? null,
    });
  }

  return summaries;
}

export async function listConversationMessagesForSubject(
  subject: string,
  conversationId: string,
): Promise<ConversationMessage[]> {
  const actor = await getActorByAuthSubject(subject);
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (
    !actor ||
    !conversation ||
    !(await canAccessConversation(actor, conversation))
  ) {
    return [];
  }

  await db
    .update(conversationMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        ne(conversationMessages.senderActorId, actor.id),
        eq(conversationMessages.isRead, false),
      ),
    );

  const rows = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt);

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    senderActorId: row.senderActorId,
    senderRole: row.senderRole,
    content: row.content,
    isRead: row.isRead,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    fileName: row.fileName,
    fileSize: row.fileSize,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function sendConversationMessageBySubject(input: {
  subject: string;
  conversationId: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}): Promise<ConversationMessage | null> {
  const actor = await getActorByAuthSubject(input.subject);
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.conversationId));

  if (
    !actor ||
    !conversation ||
    !(await canAccessConversation(actor, conversation))
  ) {
    return null;
  }

  const now = new Date();
  const [message] = await db
    .insert(conversationMessages)
    .values({
      content: input.content,
      conversationId: input.conversationId,
      fileName: input.fileName ?? null,
      fileSize: input.fileSize ?? null,
      fileType: input.fileType ?? null,
      fileUrl: input.fileUrl ?? null,
      senderActorId: actor.id,
      senderRole: actor.role,
    })
    .returning();

  if (!message) {
    return null;
  }

  await db
    .update(conversations)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(conversations.id, input.conversationId));

  const recipient = await getConversationMessageRecipient(actor, conversation);

  const notificationRecipient =
    recipient?.actor.externalUserId ?? recipient?.actor.authSubject;

  if (notificationRecipient) {
    await createNotificationForExternalUserIdSafely(
      {
        recipientExternalUserId: notificationRecipient,
        type: "new_message",
        title: "New message",
        message: `${actorDisplayName(actor)} sent you a message.`,
        data: {
          conversationId: conversation.id,
          conversationKind: conversation.kind,
          messageId: message.id,
          senderRole: actor.role,
        },
      },
      "message send",
    );
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderActorId: message.senderActorId,
    senderRole: message.senderRole,
    content: message.content,
    isRead: message.isRead,
    fileUrl: message.fileUrl,
    fileType: message.fileType,
    fileName: message.fileName,
    fileSize: message.fileSize,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function deleteConversationMessageBySubject(input: {
  subject: string;
  conversationId: string;
  messageId: string;
}): Promise<
  | { ok: true; id: string }
  | { ok: false; code: string; message: string; statusCode: 403 | 404 }
> {
  const actor = await getActorByAuthSubject(input.subject);
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.conversationId));

  if (
    !actor ||
    !conversation ||
    !(await canAccessConversation(actor, conversation))
  ) {
    return {
      ok: false,
      code: "CONVERSATION_NOT_FOUND",
      message: "No visible conversation was found for this actor.",
      statusCode: 404,
    };
  }

  const [message] = await db
    .select()
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.id, input.messageId),
        eq(conversationMessages.conversationId, input.conversationId),
      ),
    )
    .limit(1);

  if (!message) {
    return {
      ok: false,
      code: "MESSAGE_NOT_FOUND",
      message: "No message was found for the requested id.",
      statusCode: 404,
    };
  }

  if (message.senderActorId !== actor.id) {
    return {
      ok: false,
      code: "MESSAGE_DELETE_FORBIDDEN",
      message: "Only the sender can delete this message.",
      statusCode: 403,
    };
  }

  const [deleted] = await db
    .delete(conversationMessages)
    .where(eq(conversationMessages.id, input.messageId))
    .returning({ id: conversationMessages.id });

  const [latestMessage] = await db
    .select({ createdAt: conversationMessages.createdAt })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, input.conversationId))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(1);

  await db
    .update(conversations)
    .set({
      lastMessageAt: latestMessage?.createdAt ?? conversation.createdAt,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, input.conversationId));

  return { ok: true, id: deleted?.id ?? input.messageId };
}

export async function deleteConversationBySubject(input: {
  subject: string;
  conversationId: string;
}): Promise<
  | { ok: true; id: string }
  | { ok: false; code: string; message: string; statusCode: 404 }
> {
  const actor = await getActorByAuthSubject(input.subject);
  const db = getDb();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, input.conversationId));

  if (
    !actor ||
    !conversation ||
    !(await canAccessConversation(actor, conversation))
  ) {
    return {
      ok: false,
      code: "CONVERSATION_NOT_FOUND",
      message: "No visible conversation was found for this actor.",
      statusCode: 404,
    };
  }

  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, input.conversationId))
    .returning({ id: conversations.id });

  return { ok: true, id: deleted?.id ?? input.conversationId };
}
