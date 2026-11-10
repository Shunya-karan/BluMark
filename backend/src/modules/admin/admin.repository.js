
import prisma from "../../config/prisma.js";

const adminProfileSelect = {
  id: true,
  institutionId: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  institution: {
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  },
};

export function findAdminProfile(adminId, institutionId) {
  return prisma.profile.findFirst({
    where: {
      id: adminId,
      institutionId,
      role: "INSTITUTION_ADMIN",
      isActive: true,
      institution: { isActive: true },
    },
    select: adminProfileSelect,
  });
}

export function updateAdminProfile(adminId, institutionId, data) {
  return prisma.profile.update({
    where: {
      id_institutionId: {
        id: adminId,
        institutionId,
      },
    },
    data,
    select: adminProfileSelect,
  });
}

export async function getAdminDashboardSummary(institutionId) {
  const [
    studentCount,
    teacherCount,
    adminCount,
    classCount,
    subjectCount,
    departmentCount,
    activeDeviceCount,
    pendingDeviceCount,
    pendingReplacementCount,
    totalSessions,
    activeSessions,
    attendanceGroups,
  ] = await Promise.all([
    prisma.profile.count({
      where: { institutionId, role: "STUDENT", isActive: true },
    }),
    prisma.profile.count({
      where: { institutionId, role: "TEACHER", isActive: true },
    }),
    prisma.profile.count({
      where: { institutionId, role: "INSTITUTION_ADMIN", isActive: true },
    }),
    prisma.schoolClass.count({
      where: { institutionId, isActive: true },
    }),
    prisma.subject.count({
      where: { institutionId, isActive: true },
    }),
    prisma.department.count({
      where: { institutionId, isActive: true },
    }),
    prisma.device.count({
      where: { institutionId, status: "ACTIVE" },
    }),
    prisma.device.count({
      where: { institutionId, status: "PENDING" },
    }),
    prisma.deviceReplacementRequest.count({
      where: { institutionId, status: "PENDING" },
    }),
    prisma.attendanceSession.count({
      where: { institutionId },
    }),
    prisma.attendanceSession.count({
      where: {
        institutionId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: { institutionId },
      _count: { _all: true },
    }),
  ]);

  const attendanceCounts = Object.fromEntries(
    attendanceGroups.map((item) => [
      item.status,
      item._count._all,
    ]),
  );

  const present = attendanceCounts.PRESENT ?? 0;
  const late = attendanceCounts.LATE ?? 0;
  const absent = attendanceCounts.ABSENT ?? 0;
  const excused = attendanceCounts.EXCUSED ?? 0;

  const totalAttendanceRecords = present + late + absent + excused;

  return {
    users: {
      students: studentCount,
      teachers: teacherCount,
      administrators: adminCount,
      total: studentCount + teacherCount + adminCount,
    },
    academics: {
      classes: classCount,
      subjects: subjectCount,
      departments: departmentCount,
    },
    devices: {
      active: activeDeviceCount,
      pending: pendingDeviceCount,
      pendingReplacementRequests: pendingReplacementCount,
    },
    sessions: {
      total: totalSessions,
      active: activeSessions,
    },
    attendance: {
      totalRecords: totalAttendanceRecords,
      present,
      late,
      absent,
      excused,
      attendancePercentage:
        totalAttendanceRecords > 0
          ? Number(
              (((present + late) / totalAttendanceRecords) * 100).toFixed(2),
            )
          : 0,
    },
  };
}

export function findRecentInstitutionActivity(institutionId, limit = 10) {
  return prisma.auditLog.findMany({
    where: { institutionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
