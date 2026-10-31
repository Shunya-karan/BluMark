import prisma from './src/config/prisma.js';

async function main() {
  const institutionId = "da49351c-116b-4be6-9eed-2d6cfd55fba9";
  const teachers = await prisma.profile.findMany({
    where: { role: 'TEACHER', institutionId },
    select: { id: true, fullName: true, email: true }
  });
  console.log(JSON.stringify(teachers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());