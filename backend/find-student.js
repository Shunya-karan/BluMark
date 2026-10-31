import prisma from './src/config/prisma.js';

async function main() {
  const student = await prisma.profile.findFirst({
    where: { role: 'STUDENT' },
    include: {
      institution: true,
      studentDetails: true,
      credential: { select: { emailNormalized: true } },
      enrollments: { include: { schoolClass: true } }
    }
  });

  if (!student) {
    console.log(JSON.stringify({ error: 'No student found' }));
  } else {
    console.log(JSON.stringify(student, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());