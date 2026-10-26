
import { randomUUID } from "node:crypto";
import prisma from "../src/config/prisma.js";
async function main() {
  const institution = await prisma.institution.findUniqueOrThrow({
    where: { code: "BLUMARK-DEMO" },
  });

  const profiles = [
    {
      fullName: "Demo Institute Admin",
      email: "admin@blumark-demo.example",
      role: "INSTITUTION_ADMIN",
    },
    {
      fullName: "Demo Teacher One",
      email: "teacher1@blumark-demo.example",
      role: "TEACHER",
    },
    {
      fullName: "Demo Teacher Two",
      email: "teacher2@blumark-demo.example",
      role: "TEACHER",
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      fullName: `Demo Student ${index + 1}`,
      email: `student${index + 1}@blumark-demo.example`,
      role: "STUDENT",
    })),
  ];

  for (const profile of profiles) {
    await prisma.profile.upsert({
      where: {
        institutionId_email: {
          institutionId: institution.id,
          email: profile.email,
        },
      },
      update: {},
      create: {
        id:randomUUID(),
        ...profile,
        institutionId: institution.id,
      },
    });
  }

  console.log("Profiles seeded successfully.");
  console.log(`Institution: ${institution.name}`);
  console.log(`Profiles processed: ${profiles.length}`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
