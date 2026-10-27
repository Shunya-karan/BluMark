import prisma from "../../config/prisma.js";

const profileInclude = {
  institution: {
    select: { id: true, name: true, code: true, type: true, isActive: true },
  },
  studentDetails: { select: { studentNumber: true } },
  teacherDetails: {
    select: {
      employeeId: true,
      department: { select: { id: true, name: true, code: true } },
    },
  },
};

export function findProfileById(id) {
  return prisma.profile.findUnique({ where: { id }, include: profileInclude });
}

export function findActiveInstitutionById(id) {
  return prisma.institution.findFirst({
    where: { id, isActive: true },
    select: { id: true, name: true, code: true, type: true },
  });
}

export function findActiveDepartmentById(id, institutionId) {
  return prisma.department.findFirst({
    where: { id, institutionId, isActive: true },
    select: { id: true, name: true, code: true },
  });
}

export function findProfileByInstitutionAndEmail(institutionId, email) {
  return prisma.profile.findFirst({
    where: { institutionId, email },
    select: { id: true },
  });
}

export function createProfileWithDetails({ authUserId, institutionId, input }) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: {
        id: authUserId,
        institutionId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        role: input.role,
        isActive: true,
      },
    });

    if (input.role === "TEACHER") {
      await tx.teacherDetail.create({
        data: {
          profileId: profile.id,
          institutionId,
          departmentId: input.departmentId || null,
          employeeId: input.employeeId,
        },
      });
    } else {
      await tx.studentDetail.create({
        data: {
          profileId: profile.id,
          institutionId,
          studentNumber: input.studentNumber,
        },
      });
    }

    return profile;
  });
}

export function listProfilesForReconciliation() {
  return prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      institutionId: true,
      _count: {
        select: {
          studentDetails: true,
          teacherDetails: true,
          taughtSubjects: true,
          sessions: true,
          enrollments: true,
          attendance: true,
          studentDevices: true,
          devicesReviewed: true,
          auditLogs: true,
        },
      },
    },
    orderBy: [{ institutionId: "asc" }, { email: "asc" }],
  });
}


export function findDemoInstitutionProfiles() {
  return prisma.institution.findUnique({
    where: { code: "BLUMARK-DEMO" },
    select: {
      id: true,
      name: true,
      profiles: {
        where: {
          role: {
            in: ["INSTITUTION_ADMIN", "TEACHER", "STUDENT"],
          },
        },
        orderBy: [{ role: "asc" }, { id: "asc" }],
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
  });
}