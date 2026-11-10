
import prisma from "../../../config/prisma.js";

const profileSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
};

const departmentSelect = {
  id: true,
  institutionId: true,
  name: true,
  code: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const classSelect = {
  id: true,
  institutionId: true,
  departmentId: true,
  name: true,
  division: true,
  academicYear: true,
  semester: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const subjectSelect = {
  id: true,
  institutionId: true,
  name: true,
  code: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

// DEPARTMENTS

export async function createDepartment(data, db = prisma) {
  return db.department.create({
    data,
    select: departmentSelect,
  });
}

export async function findDepartments({
  institutionId,
  where,
  skip,
  take,
  sortOrder,
}) {
  const [items, total] = await prisma.$transaction([
    prisma.department.findMany({
      where: { institutionId, ...where },
      select: departmentSelect,
      orderBy: { name: sortOrder },
      skip,
      take,
    }),
    prisma.department.count({
      where: { institutionId, ...where },
    }),
  ]);

  return { items, total };
}

export async function findDepartment(id, institutionId, db = prisma) {
  return db.department.findFirst({
    where: { id, institutionId },
    select: {
      ...departmentSelect,
      _count: { select: { classes: true, teacherDetails: true } },
    },
  });
}

export async function updateDepartment(id, institutionId, data, db = prisma) {
  return db.department.update({
    where: {
      id_institutionId: { id, institutionId },
    },
    data,
    select: departmentSelect,
  });
}

// CLASSES

export async function createClass(data, db = prisma) {
  return db.schoolClass.create({
    data,
    select: classSelect,
  });
}

export async function findClasses({
  institutionId,
  where,
  skip,
  take,
  sortOrder,
}) {
  const [items, total] = await prisma.$transaction([
    prisma.schoolClass.findMany({
      where: { institutionId, ...where },
      select: {
        ...classSelect,
        department: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { enrollments: true, subjects: true },
        },
      },
      orderBy: { name: sortOrder },
      skip,
      take,
    }),
    prisma.schoolClass.count({
      where: { institutionId, ...where },
    }),
  ]);

  return { items, total };
}

export async function findClass(id, institutionId, db = prisma) {
  return db.schoolClass.findFirst({
    where: { id, institutionId },
    select: {
      ...classSelect,
      department: {
        select: { id: true, name: true, code: true },
      },
      subjects: {
        select: {
          id: true,
          subject: {
            select: { id: true, name: true, code: true },
          },
          teacher: { select: profileSelect },
        },
      },
      _count: {
        select: { enrollments: true, subjects: true },
      },
    },
  });
}

export async function findDuplicateClass({
  institutionId,
  name,
  division,
  academicYear,
  semester,
  excludeId,
}) {
  return prisma.schoolClass.findFirst({
    where: {
      institutionId,
      name,
      division: division ?? null,
      academicYear,
      semester: semester ?? null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function updateClass(id, institutionId, data, db = prisma) {
  return db.schoolClass.update({
    where: {
      id_institutionId: { id, institutionId },
    },
    data,
    select: classSelect,
  });
}

export async function findDepartmentForInstitution(id, institutionId) {
  return prisma.department.findFirst({
    where: { id, institutionId, isActive: true },
    select: { id: true },
  });
}

// SUBJECTS

export async function createSubject(data, db = prisma) {
  return db.subject.create({
    data,
    select: subjectSelect,
  });
}

export async function findSubjects({
  institutionId,
  where,
  skip,
  take,
  sortOrder,
}) {
  const [items, total] = await prisma.$transaction([
    prisma.subject.findMany({
      where: { institutionId, ...where },
      select: {
        ...subjectSelect,
        _count: { select: { classes: true } },
      },
      orderBy: { name: sortOrder },
      skip,
      take,
    }),
    prisma.subject.count({
      where: { institutionId, ...where },
    }),
  ]);

  return { items, total };
}

export async function findSubject(id, institutionId, db = prisma) {
  return db.subject.findFirst({
    where: { id, institutionId },
    select: {
      ...subjectSelect,
      classes: {
        select: {
          id: true,
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
              academicYear: true,
            },
          },
          teacher: { select: profileSelect },
        },
      },
      _count: { select: { classes: true } },
    },
  });
}

export async function updateSubject(id, institutionId, data, db = prisma) {
  return db.subject.update({
    where: {
      id_institutionId: { id, institutionId },
    },
    data,
    select: subjectSelect,
  });
}

// TEACHER ASSIGNMENTS

export async function findTeacher(teacherId, institutionId) {
  return prisma.profile.findFirst({
    where: {
      id: teacherId,
      institutionId,
      role: "TEACHER",
      isActive: true,
    },
    select: profileSelect,
  });
}

export async function findActiveClass(classId, institutionId) {
  return prisma.schoolClass.findFirst({
    where: { id: classId, institutionId, isActive: true },
    select: { id: true },
  });
}

export async function findActiveSubject(subjectId, institutionId) {
  return prisma.subject.findFirst({
    where: { id: subjectId, institutionId, isActive: true },
    select: { id: true },
  });
}

export async function createAssignment(data, db = prisma) {
  return db.classSubject.create({
    data,
    select: assignmentSelect,
  });
}

const assignmentSelect = {
  id: true,
  institutionId: true,
  classId: true,
  subjectId: true,
  teacherId: true,
  createdAt: true,
  updatedAt: true,
  schoolClass: {
    select: {
      id: true,
      name: true,
      division: true,
      academicYear: true,
      semester: true,
    },
  },
  subject: {
    select: { id: true, name: true, code: true },
  },
  teacher: { select: profileSelect },
};

export async function findAssignments({
  institutionId,
  where,
  skip,
  take,
  sortOrder,
}) {
  const [items, total] = await prisma.$transaction([
    prisma.classSubject.findMany({
      where: { institutionId, ...where },
      select: assignmentSelect,
      orderBy: { createdAt: sortOrder },
      skip,
      take,
    }),
    prisma.classSubject.count({
      where: { institutionId, ...where },
    }),
  ]);

  return { items, total };
}

export async function findAssignment(id, institutionId, db = prisma) {
  return db.classSubject.findFirst({
    where: { id, institutionId },
    select: assignmentSelect,
  });
}

export async function reassignTeacher(
  id,
  institutionId,
  teacherId,
  db = prisma,
) {
  return db.classSubject.update({
    where: {
      id_institutionId: { id, institutionId },
    },
    data: { teacherId },
    select: assignmentSelect,
  });
}
