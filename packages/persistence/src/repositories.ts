import { and, desc, eq, sql } from "drizzle-orm";
import type {
  AuthPrincipal,
  BookingDetail,
  BookingRequestInput,
  ClinicProfileSummary,
  ClinicProfileUpdateInput,
  FinalizeProfileImageUploadInput,
  FinalizeVerificationDocumentUploadInput,
  JobListingDetail,
  JobListingCreateInput,
  OnboardingSubmissionInput,
  OnboardingStatus,
  PublicRegistrationRole,
  ProfessionalProfileUpdateInput,
  ProfessionalProfileSummary,
  UploadedDocument,
  VerificationReviewInput,
  VerificationStatusResponse,
} from "@repo/contracts";
import { getDb } from "./client.js";
import {
  actors,
  bookings,
  clinicProfiles,
  jobListings,
  onboardingRecords,
  professionalProfiles,
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

  return {
    sub: aggregate.actor.authSubject,
    email: aggregate.actor.email ?? undefined,
    role: aggregate.actor.role,
    permissions: [],
    onboardingCompleted: aggregate.actor.onboardingCompleted,
    verificationStatus: aggregate.actor.verificationStatus,
    displayName: aggregate.actor.displayName ?? undefined,
  };
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
    onboardingCompleted: aggregate.actor.onboardingCompleted,
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

export async function getProfessionalProfileBySubject(
  subject: string,
): Promise<ProfessionalProfileSummary | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      profile: professionalProfiles,
    })
    .from(actors)
    .innerJoin(
      professionalProfiles,
      eq(professionalProfiles.actorId, actors.id),
    )
    .where(
      and(eq(actors.authSubject, subject), eq(actors.role, "professional")),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.profile.id,
    fullName: row.profile.fullName,
    specialty: row.profile.specialty,
    yearsExperience: row.profile.yearsExperience,
    languages: row.profile.languages,
    rating: numericToNumber(row.profile.rating),
    verificationStatus: row.actor.verificationStatus,
    onboardingCompleted: row.actor.onboardingCompleted,
    profileImageUrl: row.profile.profileImageUrl ?? undefined,
    availability: {
      status: row.profile.availabilityStatus,
      nextAvailableAt: row.profile.nextAvailableAt?.toISOString(),
      locationRadiusKm: row.profile.locationRadiusKm,
    },
  };
}

export async function getClinicProfileBySubject(
  subject: string,
): Promise<ClinicProfileSummary | null> {
  const db = getDb();
  const rows = await db
    .select({
      actor: actors,
      clinic: clinicProfiles,
    })
    .from(actors)
    .innerJoin(clinicProfiles, eq(clinicProfiles.actorId, actors.id))
    .where(and(eq(actors.authSubject, subject), eq(actors.role, "clinic")))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.clinic.id,
    organizationName: row.clinic.organizationName,
    facilityType: row.clinic.facilityType,
    city: row.clinic.city,
    region: row.clinic.region,
    verificationStatus: row.actor.verificationStatus,
    onboardingCompleted: row.actor.onboardingCompleted,
    logoUrl: row.clinic.logoUrl ?? undefined,
    openRoles: row.clinic.openRoles,
    rating: numericToNumber(row.clinic.rating),
  };
}

export async function ensureActorAccount(input: {
  subject: string;
  email?: string;
  displayName?: string;
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
          yearsExperience: 0,
          languages: ["ar"],
          availabilityStatus: "unavailable",
          locationRadiusKm: 1,
          city: "TBD",
          region: "TBD",
          latitude: "0",
          longitude: "0",
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    if (input.role === "clinic") {
      await tx
        .insert(clinicProfiles)
        .values({
          actorId: actor.id,
          organizationName: displayName,
          facilityType: "Pending onboarding",
          city: "TBD",
          region: "TBD",
          latitude: "0",
          longitude: "0",
          updatedAt: now,
        })
        .onConflictDoNothing();
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
    input.submitForReview && input.missingDocuments.length === 0;

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
          input.status === "approved" &&
          input.outstandingDocuments.length === 0,
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

function mapJobListingDetail(row: {
  clinic: typeof clinicProfiles.$inferSelect;
  job: typeof jobListings.$inferSelect;
}): JobListingDetail {
  return {
    id: row.job.id,
    title: row.job.title,
    specialty: row.job.specialty,
    employmentType: row.job.employmentType,
    status: row.job.status,
    clinicId: row.clinic.id,
    clinicName: row.clinic.organizationName,
    location: {
      city: row.job.city,
      region: row.job.region,
      latitude: numericToNumber(row.job.latitude),
      longitude: numericToNumber(row.job.longitude),
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
    .map(mapJobListingDetail);
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

  return row ? mapJobListingDetail(row) : null;
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

  return inserted[0] ? getJobListingById(inserted[0].id) : null;
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
      ),
    )
    .limit(1);

  if (existing[0]) {
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

  return { ok: true, data: booking };
}
