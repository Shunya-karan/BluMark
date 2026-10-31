import prisma from './src/config/prisma.js';

async function main() {
  const STUDENT_ID = "4154126a-e00d-469f-a028-898a4a68597d";

  const student = await prisma.profile.findUnique({
    where: { id: STUDENT_ID },
    include: {
      institution: true,
      studentDetails: true,
      credential: { select: { emailNormalized: true } },
      enrollments: {
        include: {
          schoolClass: {
            include: { department: true, subjects: true }
          }
        }
      },
      studentDevices: true,
      receivedNotifications: true,
      attendance: { include: { session: true } }
    }
  });

  const enrolledClass = student.enrollments[0]?.schoolClass;

  const classSubjects = enrolledClass
    ? await prisma.classSubject.findMany({
        where: { classId: enrolledClass.id },
        include: { subject: true, teacher: true, timetableSlots: true, studyMaterials: true }
      })
    : [];

  let totalSessions = 0;
  let presentSessions = 0;
  let absentSessions = 0;
  let lateSessions = 0;

  for (const record of student.attendance) {
    totalSessions++;
    if (record.status === "PRESENT") presentSessions++;
    else if (record.status === "LATE") { presentSessions++; lateSessions++; }
    else if (record.status === "EXCUSED") { presentSessions++; }
    else absentSessions++;
  }

  const attendancePercentage = totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(2) : 0;

  let totalStudyMaterials = classSubjects.reduce((acc, curr) => acc + curr.studyMaterials.length, 0);
  let totalTimetableSlots = classSubjects.reduce((acc, curr) => acc + curr.timetableSlots.length, 0);

  const report = {
    "Existing Student": {
      "Profile ID": student.id,
      "Student ID": student.studentDetails?.studentNumber,
      "Name": student.fullName,
      "Email": student.email,
      "Institution": student.institution?.name,
      "Department": enrolledClass?.department?.name || null,
      "Class": enrolledClass?.name + (enrolledClass?.division ? ` Div ${enrolledClass.division}` : ''),
      "Roll Number": student.studentDetails?.studentNumber
    },
    "Related Records Count": {
      "Student details": student.studentDetails ? 1 : 0,
      "Enrollments": student.enrollments.length,
      "Subjects": classSubjects.length,
      "Teacher assignments": classSubjects.filter(c => c.teacherId).length,
      "Timetable slots": totalTimetableSlots,
      "Attendance records": student.attendance.length,
      "Study materials": totalStudyMaterials,
      "Notifications": student.receivedNotifications.length,
      "Device records": student.studentDevices.length
    },
    "Attendance Status": {
      "Total Sessions (last 30 days)": totalSessions,
      "Present Sessions": presentSessions,
      "Absent Sessions": absentSessions,
      "Late Sessions": lateSessions,
      "Attendance Percentage": `${attendancePercentage}%`
    }
  };

  console.log("=== FINAL VERIFICATION REPORT ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());