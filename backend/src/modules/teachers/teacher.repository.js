import prisma from "../../config/prisma.js";

const teacherProfileInclude = {
  institution: {
    select: { id: true, name: true, code: true, type: true, isActive: true },
  },
  teacherDetails: {
    select: {
      employeeId: true,
      department: {
        select: { id: true, name: true, code: true, isActive: true },
      },
    },
  },
};

export function findTeacherProfile(profileId, institutionId) {
  return prisma.profile.findFirst({
    where: {
      id: profileId,
      institutionId,
      role: "TEACHER",
      isActive: true,
      institution: { isActive: true },
    },
    include: teacherProfileInclude,
  });
}

export function updateTeacherProfile(profileId, institutionId, data) {
  return prisma.profile.update({
    where: { id_institutionId: { id: profileId, institutionId } },
    data,
    include: teacherProfileInclude,
  });
}

export function findTeacherAssignments(teacherId, institutionId) {
  return prisma.classSubject.findMany({
    where: {
      teacherId,
      institutionId,
      schoolClass: { isActive: true },
      subject: { isActive: true },
    },
    orderBy: [
      { schoolClass: { academicYear: "desc" } },
      { schoolClass: { name: "asc" } },
      { subject: { name: "asc" } },
    ],
    select: {
      id: true,
      classId: true,
      subjectId: true,
      subject: { select: { id: true, name: true, code: true, isActive: true } },
      schoolClass: {
        select: {
          id: true,
          name: true,
          division: true,
          academicYear: true,
          semester: true,
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export function findTodayTimetable(teacherId, institutionId, weekday) {
  return prisma.timetableSlot.findMany({
    where: {
      institutionId,
      isActive: true,
      weekday,
      classSubject: {
        teacherId,
        schoolClass: { isActive: true },
        subject: { isActive: true },
      },
    },
    orderBy: [{ startTime: "asc" }],
    select: {
      id: true,
      weekday: true,
      startTime: true,
      endTime: true,
      room: true,
      classSubject: {
        select: {
          id: true,
          subject: { select: { id: true, name: true, code: true } },
          schoolClass: {
            select: { id: true, name: true, division: true, academicYear: true, semester: true },
          },
        },
      },
    },
  });
}

export async function getTeacherSummary(teacherId, institutionId) {
  const assignments = await prisma.classSubject.findMany({
    where: {
      teacherId,
      institutionId,
      schoolClass: { isActive: true },
      subject: { isActive: true },
    },
    select: { classId: true, subjectId: true },
  });

  const classIds = [...new Set(assignments.map((item) => item.classId))];
  const subjectIds = [...new Set(assignments.map((item) => item.subjectId))];

  const [studentIds, attendanceSessions, attendanceRecords] = await Promise.all([
    classIds.length
      ? prisma.enrollment.findMany({
          where: {
            institutionId,
            classId: { in: classIds },
            isActive: true,
            student: { isActive: true, role: "STUDENT" },
          },
          distinct: ["studentId"],
          select: { studentId: true },
        })
      : Promise.resolve([]),
    prisma.attendanceSession.count({ where: { institutionId, teacherId } }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        institutionId,
        session: { teacherId },
      },
      _count: { _all: true },
    }),
  ]);

  const recordCounts = Object.fromEntries(
    attendanceRecords.map((item) => [item.status, item._count._all]),
  );

  return {
    totalClasses: classIds.length,
    totalSubjects: subjectIds.length,
    totalStudents: studentIds.length,
    totalAttendanceSessions: attendanceSessions,
    attendanceRecords: {
      total: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
      present: recordCounts.PRESENT ?? 0,
      late: recordCounts.LATE ?? 0,
      absent: recordCounts.ABSENT ?? 0,
      excused: recordCounts.EXCUSED ?? 0,
    },
  };
}

export function findTeacherAttendanceSummary(teacherId, institutionId) {
  return prisma.attendanceRecord.groupBy({
    by: ["status"],
    where: {
      institutionId,
      session: { teacherId },
    },
    _count: { _all: true },
  });
}

export function findTeacherRecentActivity(teacherId, institutionId, take = 10) {
  return prisma.auditLog.findMany({
    where: { institutionId, actorId: teacherId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      createdAt: true,
    },
  });
}
