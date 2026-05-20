import { eq } from "drizzle-orm";
import { getDb, closePool } from "../client.js";
import {
  actors,
  clinicProfiles,
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
      city: "Sanaa",
      region: "Amanat Al Asimah",
      latitude: "15.3694",
      longitude: "44.1910",
      openRoles: 3,
      rating: "4.7",
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
