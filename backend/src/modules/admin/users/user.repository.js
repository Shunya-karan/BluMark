
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
      departmentId: true,
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

export function findStudent(profileId, institutionId, db = prisma) {
  return db.profile.findFirst({
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

export function findTeacher(profileId, institutionId, db = prisma) {
  return db.profile.findFirst({
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

// PROFILE UPDATES & CHECKS

export function findStudentByEmail(institutionId, email, excludeProfileId, db = prisma) {
  return db.profile.findFirst({
    where: {
      institutionId,
      email: { equals: email, mode: "insensitive" },
      id: { not: excludeProfileId },
    },
    select: { id: true },
  });
}

export function findStudentByNumber(institutionId, studentNumber, excludeProfileId, db = prisma) {
  return db.studentDetail.findFirst({
    where: {
      institutionId,
      studentNumber: { equals: studentNumber, mode: "insensitive" },
      profileId: { not: excludeProfileId },
    },
    select: { profileId: true },
  });
}

export function findTeacherByEmployeeId(institutionId, employeeId, excludeProfileId, db = prisma) {
  return db.teacherDetail.findFirst({
    where: {
      institutionId,
      employeeId: { equals: employeeId, mode: "insensitive" },
      profileId: { not: excludeProfileId },
    },
    select: { profileId: true },
  });
}

export function findDepartment(departmentId, institutionId, db = prisma) {
  return db.department.findFirst({
    where: {
      id: departmentId,
      institutionId,
      isActive: true,
    },
    select: { id: true, name: true, code: true },
  });
}

export function deactivateAllEnrollments(studentId, institutionId, db = prisma) {
  return db.enrollment.updateMany({
    where: {
      studentId,
      institutionId,
      isActive: true,
    },
    data: { isActive: false },
  });
}

export async function updateStudentDetails(
  profileId,
  institutionId,
  profileData,
  studentNumber,
  db = prisma,
) {
  if (Object.keys(profileData).length > 0) {
    await db.profile.update({
      where: {
        id_institutionId: {
          id: profileId,
          institutionId,
        },
      },
      data: profileData,
    });

    if (profileData.email) {
      await db.userCredential.updateMany({
        where: { profileId },
        data: { emailNormalized: profileData.email.toLowerCase() },
      });
    }
  }

  if (studentNumber !== undefined) {
    await db.studentDetail.upsert({
      where: {
        profileId_institutionId: {
          profileId,
          institutionId,
        },
      },
      update: { studentNumber },
      create: {
        profileId,
        institutionId,
        studentNumber,
      },
    });
  }
}

export async function updateTeacherDetails(
  profileId,
  institutionId,
  profileData,
  teacherData,
  db = prisma,
) {
  if (Object.keys(profileData).length > 0) {
    await db.profile.update({
      where: {
        id_institutionId: {
          id: profileId,
          institutionId,
        },
      },
      data: profileData,
    });

    if (profileData.email) {
      await db.userCredential.updateMany({
        where: { profileId },
        data: { emailNormalized: profileData.email.toLowerCase() },
      });
    }
  }

  if (Object.keys(teacherData).length > 0) {
    const updateData = {};
    if (teacherData.employeeId !== undefined) updateData.employeeId = teacherData.employeeId;
    if (teacherData.departmentId !== undefined) updateData.departmentId = teacherData.departmentId;

    await db.teacherDetail.upsert({
      where: {
        profileId_institutionId: {
          profileId,
          institutionId,
        },
      },
      update: updateData,
      create: {
        profileId,
        institutionId,
        employeeId: teacherData.employeeId || "",
        departmentId: teacherData.departmentId || null,
      },
    });
  }
}

