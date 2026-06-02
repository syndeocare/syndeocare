import { eq } from "drizzle-orm";
import { getDb, closePool } from "../client.js";
import {
  actors,
  bookings,
  clinicProfiles,
  jobListings,
  onboardingRecords,
  professionalProfiles,
} from "../schema.js";

async function run() {
  const db = getDb();

  await db
    .insert(actors)
    .values([
      {
        authSubject: "professional-user-001",
        role: "professional",
        email: "aseel@example.com",
        displayName: "Aseel Mohammed",
        onboardingCompleted: true,
        verificationStatus: "approved",
      },
      {
        authSubject: "clinic-user-001",
        role: "clinic",
        email: "ops@alnoor.example.com",
        displayName: "Al Noor Dental Center",
        onboardingCompleted: true,
        verificationStatus: "approved",
      },
    ])
    .onConflictDoNothing();

  const professionalActor = await db.query.actors.findFirst({
    where: eq(actors.authSubject, "professional-user-001"),
  });
  const clinicActor = await db.query.actors.findFirst({
    where: eq(actors.authSubject, "clinic-user-001"),
  });

  if (!professionalActor || !clinicActor) {
    throw new Error("Expected seed actors to exist.");
  }

  await db
    .insert(onboardingRecords)
    .values([
      {
        actorId: professionalActor.id,
        submittedAt: new Date("2026-05-18T09:00:00.000Z"),
        reviewedAt: new Date("2026-05-19T11:30:00.000Z"),
        nextAction: "You can accept job requests and apply for open shifts.",
        requiredDocuments: ["license", "government_id", "certifications"],
        missingDocuments: [],
      },
      {
        actorId: clinicActor.id,
        submittedAt: new Date("2026-05-19T07:15:00.000Z"),
        reviewedAt: new Date("2026-05-20T08:45:00.000Z"),
        nextAction: "You can publish jobs and invite professionals.",
        requiredDocuments: [
          "trade_license",
          "tax_card",
          "authorized_signatory_id",
        ],
        missingDocuments: [],
      },
    ])
    .onConflictDoUpdate({
      target: onboardingRecords.actorId,
      set: {
        submittedAt: new Date("2026-05-18T09:00:00.000Z"),
        reviewedAt: new Date("2026-05-20T08:45:00.000Z"),
        nextAction: "Seed data refreshed.",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(professionalProfiles)
    .values({
      actorId: professionalActor.id,
      fullName: "Aseel Mohammed",
      specialty: "Dental Assistant",
      headline: "Experienced chairside support for fast-paced clinics",
      bio: "Dental assistant focused on sterilization workflow, patient preparation, and Arabic-first patient communication.",
      licenseNumber: "DA-24811",
      primaryPhone: "+967700000001",
      yearsExperience: 6,
      languages: ["ar", "en"],
      rating: "4.8",
      availabilityStatus: "available",
      nextAvailableAt: new Date("2026-05-22T05:00:00.000Z"),
      locationRadiusKm: 18,
      city: "Sanaa",
      region: "Amanat Al Asimah",
      latitude: "15.3694",
      longitude: "44.1910",
    })
    .onConflictDoNothing();

  await db
    .insert(clinicProfiles)
    .values({
      actorId: clinicActor.id,
      organizationName: "Al Noor Dental Center",
      facilityType: "Dental Clinic",
      description:
        "High-trust dental center focused on premium patient experience and rapid staffing response.",
      contactPhone: "+967100000001",
      websiteUrl: "https://alnoor.example.com",
      services: ["general-dentistry", "orthodontics", "pediatric-dentistry"],
      city: "Sanaa",
      region: "Amanat Al Asimah",
      latitude: "15.3694",
      longitude: "44.1910",
      openRoles: 3,
      rating: "4.7",
    })
    .onConflictDoNothing();

  const professionalProfile = await db.query.professionalProfiles.findFirst({
    where: eq(professionalProfiles.actorId, professionalActor.id),
  });
  const clinicProfile = await db.query.clinicProfiles.findFirst({
    where: eq(clinicProfiles.actorId, clinicActor.id),
  });

  if (!professionalProfile || !clinicProfile) {
    throw new Error("Expected seed profile records to exist.");
  }

  const seededJobs = await db
    .insert(jobListings)
    .values([
      {
        clinicId: clinicProfile.id,
        title: "Temporary Dental Assistant Shift",
        specialty: "Dental Assistant",
        employmentType: "temporary_shift",
        status: "open",
        city: "Sanaa",
        region: "Amanat Al Asimah",
        latitude: "15.3694",
        longitude: "44.1910",
        radiusKm: 12,
        startsAt: new Date("2026-05-22T05:00:00.000Z"),
        endsAt: new Date("2026-05-22T13:00:00.000Z"),
        compensationAmount: "18000",
        compensationCurrency: "YER",
        compensationUnit: "shift",
        verificationRequired: true,
        summary: "Same-day dental assistant coverage for a high-volume clinic.",
        description:
          "Support chairside procedures, sterilization workflow, and patient preparation during a busy morning-to-afternoon shift.",
        requirements: [
          "Active dental assistant license",
          "At least 2 years of chairside support experience",
          "Comfort working with digital x-ray workflow",
        ],
        languages: ["ar", "en"],
        contactPreference: "in_app_chat",
      },
      {
        clinicId: clinicProfile.id,
        title: "General Dentist",
        specialty: "Dentist",
        employmentType: "permanent_role",
        status: "open",
        city: "Sanaa",
        region: "Amanat Al Asimah",
        latitude: "15.3694",
        longitude: "44.1910",
        radiusKm: 20,
        startsAt: new Date("2026-06-01T05:00:00.000Z"),
        compensationAmount: "420000",
        compensationCurrency: "YER",
        compensationUnit: "contract",
        verificationRequired: true,
        summary:
          "Permanent general dentistry role with growth into clinic leadership.",
        description:
          "Lead general dentistry appointments, coordinate treatment plans, and support quality assurance for long-term patient relationships.",
        requirements: [
          "Valid dentist license",
          "Minimum 4 years of clinic practice",
          "Strong patient communication and case documentation",
        ],
        languages: ["ar", "en"],
        contactPreference: "direct_phone",
      },
    ])
    .onConflictDoNothing()
    .returning({ id: jobListings.id, title: jobListings.title });

  const availableJobs =
    seededJobs.length > 0
      ? seededJobs
      : await db
          .select({ id: jobListings.id, title: jobListings.title })
          .from(jobListings)
          .where(eq(jobListings.clinicId, clinicProfile.id));

  const shiftJob = availableJobs.find(
    (job) => job.title === "Temporary Dental Assistant Shift",
  );

  if (!shiftJob) {
    throw new Error("Expected seeded shift job to exist.");
  }

  await db
    .insert(bookings)
    .values({
      jobId: shiftJob.id,
      clinicId: clinicProfile.id,
      professionalId: professionalProfile.id,
      status: "confirmed",
      notes: "Bring clinic-issued ID for front-desk verification on arrival.",
      requestedAt: new Date("2026-05-20T08:30:00.000Z"),
      lastUpdatedAt: new Date("2026-05-20T10:15:00.000Z"),
    })
    .onConflictDoNothing();

  console.log("Seeded persistence baseline data.");
}

run()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
