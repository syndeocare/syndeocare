import { and, eq } from "drizzle-orm";
import type {
  AuthPrincipal,
  ClinicProfileSummary,
  OnboardingStatus,
  ProfessionalProfileSummary,
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
