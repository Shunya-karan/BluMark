import prisma from './src/config/prisma.js';

async function main() {
  console.log("Starting data population...");

  // 1. Find the single student
  const student = await prisma.profile.findFirst({ where: { role: 'STUDENT' } });
  if (!student) throw new Error("No student found");
  const STUDENT_ID = student.id;
  const INSTITUTION_ID = student.institutionId;

  // 2. Find the single teacher
  let teacher = await prisma.profile.findFirst({ where: { role: 'TEACHER', institutionId: INSTITUTION_ID } });
  if (!teacher) {
    throw new Error("No teacher found in institution");
  }
  const TEACHER_1 = teacher.id;

  // Let's create a second teacher so we can assign different subjects to different teachers.
  let teacher2 = await prisma.profile.findFirst({ where: { email: 'teacher2@gmail.com' } });
  if (!teacher2) {
    const { randomUUID } = await import("node:crypto");
    teacher2 = await prisma.profile.create({
      data: {
        id: randomUUID(),
        institutionId: INSTITUTION_ID,
        fullName: "Demo Teacher 2",
        email: "teacher2@gmail.com",
        role: "TEACHER",
        isActive: true,
        teacherDetails: {
          create: {
            employeeId: "EMP-2026-002"
          }
        },
        credential: {
          create: {
            emailNormalized: "teacher2@gmail.com",
            passwordHash: "dummy",
            mustChangePassword: true,
            activatedAt: new Date(),
          }
        }
      }
    });
  }
  const TEACHER_2 = teacher2.id;

  // 3. Find the enrolled class for the student
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: STUDENT_ID, institutionId: INSTITUTION_ID, isActive: true }
  });
  if (!enrollment) throw new Error("Student has no active enrollments");
  const CLASS_ID = enrollment.classId;

  const SUBJECTS_DATA = [
    { name: "Database Management Systems", code: "CS-DBMS", teacherId: TEACHER_1 },
    { name: "Data Structures and Algorithms", code: "CS-DSA", teacherId: TEACHER_1 },
    { name: "Operating Systems", code: "CS-OS", teacherId: TEACHER_2 },
    { name: "Computer Networks", code: "CS-CN", teacherId: TEACHER_2 },
    { name: "Web Development", code: "CS-WEB", teacherId: TEACHER_1 },
    { name: "Software Engineering", code: "CS-SE", teacherId: TEACHER_2 }
  ];

  // 4. Create or ensure Subjects exist
  const subjects = {};
  for (const s of SUBJECTS_DATA) {
    const subject = await prisma.subject.upsert({
      where: { institutionId_code: { institutionId: INSTITUTION_ID, code: s.code } },
      update: { name: s.name, isActive: true },
      create: { institutionId: INSTITUTION_ID, name: s.name, code: s.code }
    });
    subjects[s.code] = subject;
  }

  // 5. Map Subjects to Class (ClassSubject)
  const classSubjects = {};
  for (const s of SUBJECTS_DATA) {
    const subjectId = subjects[s.code].id;
    // Prisma upsert needs unique identifier. For class_subjects it's id_institutionId or id_institutionId_teacherId etc, or classId_subjectId_teacherId
    const cs = await prisma.classSubject.upsert({
      where: { classId_subjectId_teacherId: { classId: CLASS_ID, subjectId: subjectId, teacherId: s.teacherId } },
      update: {},
      create: { institutionId: INSTITUTION_ID, classId: CLASS_ID, subjectId: subjectId, teacherId: s.teacherId }
    });
    classSubjects[s.code] = cs;
  }

  // 6. Timetable Slots
  const TIMETABLE_DATA = [
    // Monday (weekday 1)
    { weekday: 1, startTime: "09:00:00", endTime: "10:00:00", code: "CS-DBMS" },
    { weekday: 1, startTime: "10:00:00", endTime: "11:00:00", code: "CS-OS" },
    { weekday: 1, startTime: "11:15:00", endTime: "12:15:00", code: "CS-WEB" },
    // Tuesday (weekday 2)
    { weekday: 2, startTime: "09:00:00", endTime: "10:00:00", code: "CS-CN" },
    { weekday: 2, startTime: "10:00:00", endTime: "11:00:00", code: "CS-DSA" },
    // Wednesday (weekday 3)
    { weekday: 3, startTime: "09:00:00", endTime: "10:00:00", code: "CS-SE" },
    { weekday: 3, startTime: "10:00:00", endTime: "11:00:00", code: "CS-DBMS" },
    // Thursday (weekday 4)
    { weekday: 4, startTime: "09:00:00", endTime: "10:00:00", code: "CS-OS" },
    { weekday: 4, startTime: "10:00:00", endTime: "11:00:00", code: "CS-WEB" },
    // Friday (weekday 5)
    { weekday: 5, startTime: "09:00:00", endTime: "10:00:00", code: "CS-DSA" },
    { weekday: 5, startTime: "10:00:00", endTime: "11:00:00", code: "CS-CN" },
  ];

  for (const t of TIMETABLE_DATA) {
    const csId = classSubjects[t.code].id;
    const startDt = new Date(`1970-01-01T${t.startTime}Z`);
    const endDt = new Date(`1970-01-01T${t.endTime}Z`);

    const existing = await prisma.timetableSlot.findFirst({
      where: { classSubjectId: csId, weekday: t.weekday, startTime: startDt }
    });
    if (!existing) {
      await prisma.timetableSlot.create({
        data: {
          institutionId: INSTITUTION_ID,
          classSubjectId: csId,
          weekday: t.weekday,
          startTime: startDt,
          endTime: endDt,
          room: `Room-${Math.floor(Math.random()*100 + 100)}`
        }
      });
    }
  }

  const fullTimetable = await prisma.timetableSlot.findMany({
    where: { classSubjectId: { in: Object.values(classSubjects).map(c => c.id) } }
  });

  // 7. Create Attendance Sessions and Records for the past 30 days
  const today = new Date();
  today.setHours(0,0,0,0);

  let totalSessions = 0;
  let presentCount = 0;
  let absentCount = 0;

  for (let i = 30; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const weekday = date.getDay() || 7; // 1 = Monday, 7 = Sunday

    const daySlots = fullTimetable.filter(slot => slot.weekday === weekday);

    for (const slot of daySlots) {
      const cs = Object.values(classSubjects).find(c => c.id === slot.classSubjectId);

      const start = new Date(date);
      start.setUTCHours(slot.startTime.getUTCHours(), slot.startTime.getUTCMinutes());
      const end = new Date(date);
      end.setUTCHours(slot.endTime.getUTCHours(), slot.endTime.getUTCMinutes());

      const sessionCode = `SESS-${cs.id.substring(0,6)}-${start.getTime()}`;

      const session = await prisma.attendanceSession.upsert({
        where: { institutionId_sessionCode: { institutionId: INSTITUTION_ID, sessionCode: sessionCode } },
        update: {},
        create: {
          institutionId: INSTITUTION_ID,
          classSubjectId: cs.id,
          teacherId: cs.teacherId,
          timetableSlotId: slot.id,
          sessionCode: sessionCode,
          bleTokenSeed: `seed-${Math.random()}`,
          status: "COMPLETED",
          startsAt: start,
          expiresAt: end,
          endedAt: end,
          createdAt: start
        }
      });

      const rand = Math.random();
      let status = "PRESENT";
      if (rand > 0.95) status = "ABSENT";
      else if (rand > 0.85) status = "LATE";

      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: STUDENT_ID } }
      });

      if (!existingRecord) {
        await prisma.attendanceRecord.create({
          data: {
            institutionId: INSTITUTION_ID,
            sessionId: session.id,
            studentId: STUDENT_ID,
            status: status,
            method: "BLE",
            markedAt: start,
            rssi: -50 - Math.floor(Math.random()*20)
          }
        });
        totalSessions++;
        if (status === "PRESENT" || status === "LATE") presentCount++;
        else absentCount++;
      }
    }
  }
  console.log(`Generated ${totalSessions} attendance records.`);

  // 8. Study Materials
  const MATERIALS = [
    { title: "DBMS Unit 1 Notes", desc: "Introduction to RDBMS", code: "CS-DBMS" },
    { title: "Operating Systems Process Management", desc: "CPU Scheduling algorithms", code: "CS-OS" },
    { title: "Computer Networks TCP/IP Notes", desc: "Layered architecture", code: "CS-CN" },
    { title: "Data Structures Sorting Algorithms", desc: "Quick Sort, Merge Sort, etc.", code: "CS-DSA" },
    { title: "Web Development HTML and CSS Notes", desc: "Basics of Frontend", code: "CS-WEB" }
  ];

  for (const m of MATERIALS) {
    const csId = classSubjects[m.code].id;
    const cs = Object.values(classSubjects).find(c => c.id === csId);
    const existing = await prisma.studyMaterial.findFirst({
      where: { classSubjectId: csId, title: m.title }
    });
    if (!existing) {
      await prisma.studyMaterial.create({
        data: {
          institutionId: INSTITUTION_ID,
          classSubjectId: csId,
          uploadedBy: cs.teacherId,
          title: m.title,
          description: m.desc,
          fileUrl: "https://example.com/materials/dummy.pdf",
          fileType: "application/pdf"
        }
      });
    }
  }

  // 9. Notifications
  const notificationsCount = await prisma.notification.count({
    where: { recipientId: STUDENT_ID }
  });
  if (notificationsCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          institutionId: INSTITUTION_ID,
          recipientId: STUDENT_ID,
          title: "Attendance Update",
          body: "Your attendance for Web Development has been marked successfully.",
          type: "ATTENDANCE",
          createdAt: new Date()
        },
        {
          institutionId: INSTITUTION_ID,
          recipientId: STUDENT_ID,
          title: "New Study Material",
          body: "DBMS Unit 1 Notes has been uploaded.",
          type: "MATERIAL",
          createdAt: new Date(Date.now() - 86400000)
        }
      ]
    });
  }

  // 10. Device
  const existingDevice = await prisma.device.findFirst({
    where: { profileId: STUDENT_ID }
  });
  if (!existingDevice) {
    await prisma.device.create({
      data: {
        institutionId: INSTITUTION_ID,
        profileId: STUDENT_ID,
        deviceIdentifier: "demo-device-001",
        status: "ACTIVE",
        registeredAt: new Date(),
      }
    });
  }

  console.log("Data seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());