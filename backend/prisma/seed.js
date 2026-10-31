import "dotenv/config";
import { randomUUID } from "node:crypto";
import prisma from "../src/config/prisma.js";
import { hashPassword, generateTemporaryPassword } from "../src/utils/auth/password.util.js";
import { sendProvisionedUserCredentials } from "../src/config/email.js";

async function clearDatabase() {
  console.log("Clearing all application tables...");

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.attendanceSession.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.studyMaterial.deleteMany(),
    prisma.deviceReplacementRequest.deleteMany(),
    prisma.device.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.classSubject.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.schoolClass.deleteMany(),
    prisma.teacherDetail.deleteMany(),
    prisma.studentDetail.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.accountActivationToken.deleteMany(),
    prisma.userCredential.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.department.deleteMany(),
    prisma.institution.deleteMany(),
  ]);

  console.log("Database cleared successfully.");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.includes("localhost") && !dbUrl.includes("supabase.co"))) {
    throw new Error("Safety Check Failed: DATABASE_URL does not appear to be a local or known demo Supabase database. Exiting to prevent accidental production wipe.");
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  await clearDatabase();

  // 1. Create Institution
  const institutionId = randomUUID();
  const institution = await prisma.institution.create({
    data: {
      id: institutionId,
      name: "Blu-Mark Demo College",
      code: "BLUMARK-DEMO",
      type: "UNIVERSITY",
      email: "info@blumark-demo.com",
      isActive: true,
    }
  });

  // 2. Create Department
  const departmentId = randomUUID();
  await prisma.department.create({
    data: {
      id: departmentId,
      institutionId,
      name: "Computer Science",
      code: "CS",
      isActive: true,
    }
  });

  // 3. Create Admin
  const adminId = randomUUID();
  const adminEmail = "admin@gmail.com";
  await prisma.profile.create({
    data: {
      id: adminId,
      institutionId,
      fullName: "Demo Admin",
      email: adminEmail,
      role: "INSTITUTION_ADMIN",
      isActive: true,
      credential: {
        create: {
          emailNormalized: adminEmail,
          passwordHash,
          mustChangePassword: true,
          activatedAt: new Date(),
        }
      }
    }
  });

  // 4. Create Teacher
  const teacherId = randomUUID();
  const teacherEmail = "teacher@gmail.com";
  await prisma.profile.create({
    data: {
      id: teacherId,
      institutionId,
      fullName: "Demo Teacher",
      email: teacherEmail,
      role: "TEACHER",
      isActive: true,
      teacherDetails: {
        create: {
          departmentId,
          employeeId: "EMP-2026-001"
        }
      },
      credential: {
        create: {
          emailNormalized: teacherEmail,
          passwordHash,
          mustChangePassword: true,
          activatedAt: new Date(),
        }
      }
    }
  });

  // 5. Create Student
  const studentId = randomUUID();
  const studentEmail = "student@gmail.com";
  await prisma.profile.create({
    data: {
      id: studentId,
      institutionId,
      fullName: "Demo Student",
      email: studentEmail,
      role: "STUDENT",
      isActive: true,
      studentDetails: {
        create: {
          studentNumber: "STU-2026-001"
        }
      },
      credential: {
        create: {
          emailNormalized: studentEmail,
          passwordHash,
          mustChangePassword: true,
          activatedAt: new Date(),
        }
      }
    }
  });

  // 6. Create SchoolClass
  const classId = randomUUID();
  await prisma.schoolClass.create({
    data: {
      id: classId,
      institutionId,
      departmentId,
      name: "BSc Computer Science",
      division: "A",
      academicYear: "2026-2027",
      semester: 1,
      isActive: true,
    }
  });

  // 7. Create Enrollment
  await prisma.enrollment.create({
    data: {
      institutionId,
      studentId,
      classId,
      isActive: true,
    }
  });

  // 8. Create Subject
  const subjectId = randomUUID();
  await prisma.subject.create({
    data: {
      id: subjectId,
      institutionId,
      name: "Software Engineering",
      code: "SE-101",
      isActive: true,
    }
  });

  // 9. Create ClassSubject (Links Teacher, Class, Subject)
  const classSubjectId = randomUUID();
  await prisma.classSubject.create({
    data: {
      id: classSubjectId,
      institutionId,
      classId,
      subjectId,
      teacherId,
    }
  });

  // 10. Optional: Create TimetableSlot
  await prisma.timetableSlot.create({
    data: {
      id: randomUUID(),
      institutionId,
      classSubjectId,
      weekday: 1, // Monday
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T10:00:00Z"),
      room: "Lab 1",
      isActive: true
    }
  });

  console.log("Attempting to send credentials via email...");
  const accounts = [
    { email: adminEmail, fullName: "Demo Admin" },
    { email: teacherEmail, fullName: "Demo Teacher" },
    { email: studentEmail, fullName: "Demo Student" }
  ];

  for (const account of accounts) {
    try {
      await sendProvisionedUserCredentials(account.email, {
        fullName: account.fullName,
        temporaryPassword: tempPassword
      });
      console.log(`Email sent to ${account.email}`);
    } catch (e) {
      console.log(`Skipping email delivery for ${account.email} - SMTP not configured or failed.`);
    }
  }

  console.log("------------------------------------------");
  console.log("Database reset and demo data seeded successfully!");
  console.log("Institution: Blu-Mark Demo College");
  console.log("Users Created:");
  console.log("- Admin: admin@gmail.com");
  console.log("- Teacher: teacher@gmail.com");
  console.log("- Student: student@gmail.com");
  console.log(`Temporary Password: ${tempPassword}`);
  console.log("All three users have 'mustChangePassword = true'.");
}

main().catch(e => {
  console.error("Seed script failed:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
