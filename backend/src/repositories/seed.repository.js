import prisma from "../config/prisma.js";

export function findInstitutionByCode(code) {
  return prisma.institution.findUniqueOrThrow({ where: { code } });
}

export function findDepartmentByInstitutionAndCode(institutionId, code) {
  return prisma.department.findUniqueOrThrow({
    where: { institutionId_code: { institutionId, code } },
  });
}

export function listActiveProfilesByRole(institutionId, role) {
  return prisma.profile.findMany({
    where: { institutionId, role, isActive: true },
    orderBy: { email: "asc" },
  });
}

export function upsertSchoolClass(institutionId, departmentId, definition) {
  return prisma.schoolClass.upsert({
    where: {
      institutionId_name_division_academicYear_semester: {
        institutionId,
        name: definition.name,
        division: definition.division,
        academicYear: definition.academicYear,
        semester: definition.semester,
      },
    },
    update: { departmentId, isActive: true },
    create: { institutionId, departmentId, ...definition },
  });
}

export function upsertSubject(institutionId, definition) {
  return prisma.subject.upsert({
    where: { institutionId_code: { institutionId, code: definition.code } },
    update: { name: definition.name, isActive: true },
    create: { institutionId, ...definition },
  });
}

export function upsertEnrollment(institutionId, studentId, classId) {
  return prisma.enrollment.upsert({
    where: { studentId_classId: { studentId, classId } },
    update: { institutionId, isActive: true },
    create: { institutionId, studentId, classId },
  });
}

export function upsertClassSubject(
  institutionId,
  schoolClassId,
  subjectId,
  teacherId,
) {
  return prisma.classSubject.upsert({
    where: {
      classId_subjectId_teacherId: {
        classId: schoolClassId,
        subjectId,
        teacherId,
      },
    },
    update: { institutionId },
    create: {
      institutionId,
      classId: schoolClassId,
      subjectId,
      teacherId,
    },
  });
}
