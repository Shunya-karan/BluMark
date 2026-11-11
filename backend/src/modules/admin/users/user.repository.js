
import prisma from "../../../config/prisma.js";

const profileSelect = {
  id: true,
  institutionId: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const studentSelect = {
  ...profileSelect,
  studentDetails: {
    select: {
      studentNumber: true,
    },
  },
};

const teacherSelect = {
  ...profileSelect,
  teacherDetails: {
    select: {
      employeeId: true,
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
    },
  },
};

// STUDENTS

export async function findStudents({
  institutionId,
  where,
  skip,
  take,
  sortOrder,
}) {
  const [items, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where: {
        institutionId,
        role: "STUDENT",
        ...where,
      },
      select: {
        ...studentSelect,
        enrollments: {
          where: { isActive: true },
          select: {
            id: true,
            enrolledAt: true,
            schoolClass: {
              select: {
                id: true,
                name: true,
                division: true,
                academicYear: true,
                semester: true,
              },
            },
          },
          take: 2,
        },
      },
      orderBy: { fullName: sortOrder },
      skip,
      take,
    }),

    prisma.profile.count({
      where: {
        institutionId,
        role: "STUDENT",
        ...where,
      },
    }),
  ]);

  return { items, total };
}

export function findStudent(profileId, institutionId) {
  return prisma.profile.findFirst({
    where: {
      id: profileId,
      institutionId,
      role: "STUDENT",
    },
    select: {
      ...studentSelect,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        select: {
          id: true,
          classId: true,
          enrolledAt: true,
          isActive: true,
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
              academicYear: true,
              semester: true,
              isActive: true,
              department: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          attendance: true,
          studentDevices: true,
        },
      },
    },
  });
}

// TEACHERS

export async function findTeachers({
  institutionId,
  where,
  skip,
  take,
  sortOrder,
}) {
  const [items, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where: {
        institutionId,
        role: "TEACHER",
        ...where,
      },
      select: {
        ...teacherSelect,
        _count: {
          select: {
            taughtSubjects: true,
          },
        },
      },
      orderBy: { fullName: sortOrder },
      skip,
      take,
    }),

    prisma.profile.count({
      where: {
        institutionId,
        role: "TEACHER",
        ...where,
      },
    }),
  ]);

  return { items, total };
}

export function findTeacher(profileId, institutionId) {
  return prisma.profile.findFirst({
    where: {
      id: profileId,
      institutionId,
      role: "TEACHER",
    },
    select: {
      ...teacherSelect,
      taughtSubjects: {
        select: {
          id: true,
          classId: true,
          subjectId: true,
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
              academicYear: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });
}

// ACCOUNT STATUS

export function findManageableUser(profileId, institutionId, db = prisma) {
  return db.profile.findFirst({
    where: {
      id: profileId,
      institutionId,
      role: { in: ["STUDENT", "TEACHER"] },
    },
    select: profileSelect,
  });
}

export function updateUserStatus(profileId, institutionId, isActive, db = prisma) {
  return db.profile.update({
    where: {
      id_institutionId: {
        id: profileId,
        institutionId,
      },
    },
    data: { isActive },
    select: profileSelect,
  });
}

export function revokeUserSessions(profileId, db = prisma) {
  return db.authSession.updateMany({
    where: {
      profileId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revocationReason: "ACCOUNT_DISABLED",
    },
  });
}

// ENROLLMENTS

export function findStudentEnrollment(profileId, institutionId, db = prisma) {
  return db.enrollment.findMany({
    where: {
      studentId: profileId,
      institutionId,
      isActive: true,
    },
    select: {
      id: true,
      studentId: true,
      classId: true,
      enrolledAt: true,
      isActive: true,
      schoolClass: {
        select: {
          id: true,
          name: true,
          division: true,
          academicYear: true,
          semester: true,
          isActive: true,
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });
}

export function findStudentForEnrollment(profileId, institutionId, db = prisma) {
  return db.profile.findFirst({
    where: {
      id: profileId,
      institutionId,
      role: "STUDENT",
      isActive: true,
    },
    select: { id: true },
  });
}

export function findActiveClass(classId, institutionId, db = prisma) {
  return db.schoolClass.findFirst({
    where: {
      id: classId,
      institutionId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      division: true,
      academicYear: true,
      semester: true,
    },
  });
}

export function findExistingEnrollment(studentId, classId, institutionId, db = prisma) {
  return db.enrollment.findUnique({
    where: {
      studentId_classId: {
        studentId,
        classId,
      },
    },
    select: {
      id: true,
      isActive: true,
      classId: true,
    },
  });
}

export function deactivateOtherEnrollments(
  studentId,
  institutionId,
  classId,
  db = prisma,
) {
  return db.enrollment.updateMany({
    where: {
      studentId,
      institutionId,
      isActive: true,
      classId: { not: classId },
    },
    data: { isActive: false },
  });
}

export function activateEnrollment(
  studentId,
  classId,
  institutionId,
  existingEnrollment,
  db = prisma,
) {
  if (existingEnrollment) {
    return db.enrollment.update({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
      data: {
        institutionId,
        isActive: true,
        enrolledAt: new Date(),
      },
      select: {
        id: true,
        studentId: true,
        classId: true,
        enrolledAt: true,
        isActive: true,
        schoolClass: {
          select: {
            id: true,
            name: true,
            division: true,
            academicYear: true,
            semester: true,
          },
        },
      },
    });
  }

  return db.enrollment.create({
    data: {
      studentId,
      classId,
      institutionId,
      isActive: true,
    },
    select: {
      id: true,
      studentId: true,
      classId: true,
      enrolledAt: true,
      isActive: true,
      schoolClass: {
        select: {
          id: true,
          name: true,
          division: true,
          academicYear: true,
          semester: true,
        },
      },
    },
  });
}
