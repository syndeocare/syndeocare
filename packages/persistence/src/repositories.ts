import { and, eq } from "drizzle-orm";
import type {
  ClinicProfileUpdateInput,
  AuthPrincipal,
  PublicRegistrationRole,
  ClinicProfileSummary,
  OnboardingSubmissionInput,
  OnboardingStatus,
  ProfessionalProfileUpdateInput,
  ProfessionalProfileSummary,
  VerificationReviewInput,
  VerificationStatusResponse,
} from "@repo/contracts";
import { getDb } from "./client.js";
import {
  actors,
  clinicProfiles,
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
