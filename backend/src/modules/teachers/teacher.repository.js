
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

// TEACHER DASHBOARD & PROFILE

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
      subject: {
        select: { id: true, name: true, code: true, isActive: true },
      },
      schoolClass: {
        select: {
          id: true,
          name: true,
          division: true,
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, name: true, code: true },
          },
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
        institutionId,
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
          subject: {
            select: { id: true, name: true, code: true },
          },
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

  const [studentIds, attendanceSessions, attendanceRecords] =
    await Promise.all([
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

      prisma.attendanceSession.count({
        where: { institutionId, teacherId },
      }),

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
      total: Object.values(recordCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
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

export function findTeacherRecentActivity(
  teacherId,
  institutionId,
  take = 10,
) {
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

// TEACHER CLASS MANAGEMENT

export function findAssignedClasses(teacherId, institutionId) {
  return prisma.classSubject.findMany({
    where: {
      teacherId,
      institutionId,
      schoolClass: { isActive: true },
    },
    distinct: ["classId"],
    orderBy: {
      schoolClass: { name: "asc" },
    },
    select: {
      classId: true,
      schoolClass: {
        select: {
          id: true,
          name: true,
          division: true,
          academicYear: true,
          semester: true,
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });
}

export function findAssignedClassById(
  teacherId,
  institutionId,
  classId,
) {
  return prisma.schoolClass.findFirst({
    where: {
      id: classId,
      institutionId,
      isActive: true,
      subjects: {
        some: {
          teacherId,
          institutionId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      division: true,
      academicYear: true,
      semester: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });
}

// CLASS STUDENTS

export async function findClassStudents(
  teacherId,
  institutionId,
  classId,
) {
  return prisma.enrollment.findMany({
    where: {
      institutionId,
      classId,
      isActive: true,
      student: {
        institutionId,
        role: "STUDENT",
        isActive: true,
      },
      schoolClass: {
        isActive: true,
        subjects: {
          some: { teacherId, institutionId },
        },
      },
    },
    select: {
      id: true,
      enrolledAt: true,
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          studentDetails: {
            select: { studentNumber: true },
          },
        },
      },
    },
    orderBy: {
      student: { fullName: "asc" },
    },
  });
}
export async function findClassStudentById(
  teacherId,
  institutionId,
  classId,
  studentId,
) {
  return prisma.enrollment.findFirst({
    where: {
      institutionId,
      classId,
      studentId,
      isActive: true,
      student: {
        institutionId,
        role: "STUDENT",
        isActive: true,
      },
      schoolClass: {
        isActive: true,
        subjects: {
          some: { teacherId, institutionId },
        },
      },
    },
    select: {
      id: true,
      enrolledAt: true,
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          studentDetails: {
            select: { studentNumber: true },
          },
        },
      },
    },
  });
}
//  CLASS SUBJECTS
export function findClassSubjects(
  teacherId,
  institutionId,
  classId,
) {
  return prisma.classSubject.findMany({
    where: {
      teacherId,
      institutionId,
      classId,
      schoolClass: { isActive: true },
      subject: { isActive: true },
    },
    orderBy: {
      subject: { name: "asc" },
    },
    select: {
      id: true,
      classId: true,
      subjectId: true,
      teacherId: true,
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
    },
  });
}

export function findClassSubjectById(
  teacherId,
  institutionId,
  classId,
  subjectId,
) {
  return prisma.classSubject.findFirst({
    where: {
      teacherId,
      institutionId,
      classId,
      subjectId,
      schoolClass: { isActive: true },
      subject: { isActive: true },
    },
    select: {
      id: true,
      classId: true,
      subjectId: true,
      teacherId: true,
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
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

// CLASS STATISTICS

export async function getClassStatistics(
  teacherId,
  institutionId,
  classId,
) {
  const assignmentWhere = {
    institutionId,
    teacherId,
    classId,
    schoolClass: { isActive: true },
    subject: { isActive: true },
  };

  const [totalSubjects, totalStudents, totalSessions, attendanceGroups] =
    await Promise.all([
      prisma.classSubject.count({
        where: assignmentWhere,
      }),

      prisma.enrollment.count({
        where: {
          institutionId,
          classId,
          isActive: true,
          student: {
            institutionId,
            role: "STUDENT",
            isActive: true,
          },
        },
      }),

      prisma.attendanceSession.count({
        where: {
          institutionId,
          teacherId,
          classSubject: { classId },
        },
      }),

      prisma.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          institutionId,
          session: {
            institutionId,
            teacherId,
            classSubject: { classId },
          },
        },
        _count: { _all: true },
      }),
    ]);

  const counts = Object.fromEntries(
    attendanceGroups.map((item) => [
      item.status,
      item._count._all,
    ]),
  );

  const present = counts.PRESENT ?? 0;
  const late = counts.LATE ?? 0;
  const absent = counts.ABSENT ?? 0;
  const excused = counts.EXCUSED ?? 0;

  const totalRecords = present + late + absent + excused;

  const attendancePercentage =
    totalRecords > 0
      ? Number((((present + late) / totalRecords) * 100).toFixed(2))
      : 0;

  return {
    totalSubjects,
    totalStudents,
    totalSessions,
    attendance: {
      totalRecords,
      present,
      late,
      absent,
      excused,
      attendancePercentage,
    },
  };
}


// MODULE 3: PAGINATED STUDENT DIRECTORY


export function findClassStudentsPaginated({
  teacherId,
  institutionId,
  classId,
  page,
  limit,
  search,
  enrollmentStatus,
  sortBy,
  sortOrder,
}) {
  const where = {
    institutionId,
    classId,

    // Restrict students to this teacher's assigned class.
    schoolClass: {
      isActive: true,
      subjects: {
        some: {
          teacherId,
          institutionId,
        },
      },
    },

    student: {
      institutionId,
      role: "STUDENT",
      isActive: true,
    },
  };

  // Enrollment filter: active, inactive or all.
  if (enrollmentStatus !== "all") {
    where.isActive = enrollmentStatus === "active";
  }

  // Search by student name, email or student number.
  if (search) {
    where.student = {
      ...where.student,
      OR: [
        {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          studentDetails: {
            is: {
              studentNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    };
  }

  const orderBy =
    sortBy === "enrolledAt"
      ? { enrolledAt: sortOrder }
      : { student: { fullName: sortOrder } };

  const skip = (page - 1) * limit;

  return Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        enrolledAt: true,
        isActive: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            studentDetails: {
              select: {
                studentNumber: true,
              },
            },
          },
        },
      },
    }),

    prisma.enrollment.count({ where }),
  ]);
}


// MODULE 4: TEACHER ATTENDANCE HISTORY
// ==========================================

export function findTeacherAttendanceSessions({
  teacherId,
  institutionId,
  page,
  limit,
  classId,
}) {
  const where = {
    teacherId,
    institutionId,
  };

  if (classId) {
    where.classSubject = {
      classId,
      schoolClass: {
        isActive: true,
      },
    };
  }

  const skip = (page - 1) * limit;

  return Promise.all([
    prisma.attendanceSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        startsAt: "desc",
      },
      select: {
        id: true,
        sessionCode: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        endedAt: true,
        classSubject: {
          select: {
            id: true,
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            schoolClass: {
              select: {
                id: true,
                name: true,
                division: true,
                academicYear: true,
              },
            },
          },
        },
        _count: {
          select: {
            records: true,
          },
        },
      },
    }),

    prisma.attendanceSession.count({ where }),
  ]);
}

export function findTeacherAttendanceSessionById(
  teacherId,
  institutionId,
  sessionId,
) {
  return prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      teacherId,
      institutionId,
    },
    select: {
      id: true,
      sessionCode: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      endedAt: true,
      classSubject: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
              academicYear: true,
            },
          },
        },
      },
      _count: {
        select: {
          records: true,
        },
      },
    },
  });
}

export function findSessionAttendanceRecords({
  institutionId,
  sessionId,
  page,
  limit,
  status,
}) {
  const where = {
    institutionId,
    sessionId,
  };

  if (status) {
    where.status = status;
  }

  const skip = (page - 1) * limit;

  return Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        markedAt: "desc",
      },
      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,
        rssi: true,
        notes: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentDetails: {
              select: {
                studentNumber: true,
              },
            },
          },
        },
      },
    }),

    prisma.attendanceRecord.count({ where }),
  ]);
}

// ==========================================
// MODULE 5: TEACHER TIMETABLE

export function findTeacherWeeklyTimetable(
  teacherId,
  institutionId,
) {
  return prisma.timetableSlot.findMany({
    where: {
      institutionId,
      isActive: true,
      classSubject: {
        teacherId,
        institutionId,
        schoolClass: {
          isActive: true,
        },
        subject: {
          isActive: true,
        },
      },
    },
    orderBy: [
      { weekday: "asc" },
      { startTime: "asc" },
    ],
    select: {
      id: true,
      weekday: true,
      startTime: true,
      endTime: true,
      room: true,
      classSubject: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
              academicYear: true,
            },
          },
        },
      },
    },
  });
}

export function findTeacherTimetableByWeekday(
  teacherId,
  institutionId,
  weekday,
) {
  return prisma.timetableSlot.findMany({
    where: {
      institutionId,
      weekday,
      isActive: true,
      classSubject: {
        teacherId,
        institutionId,
        schoolClass: {
          isActive: true,
        },
        subject: {
          isActive: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
    select: {
      id: true,
      weekday: true,
      startTime: true,
      endTime: true,
      room: true,
      classSubject: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
              academicYear: true,
            },
          },
        },
      },
    },
  });
}

// ==========================================
// MODULE 6: TEACHER STUDY MATERIALS
// ==========================================

export function findTeacherStudyMaterials({
  teacherId,
  institutionId,
  page,
  limit,
  search,
  classId,
}) {
  const where = {
    institutionId,
    uploadedBy: teacherId,
    classSubject: {
      institutionId,
      teacherId,
      schoolClass: {
        isActive: true,
      },
      subject: {
        isActive: true,
      },
    },
  };

  if (classId) {
    where.classSubject.classId = classId;
  }

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  return Promise.all([
    prisma.studyMaterial.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        fileUrl: true,
        fileType: true,
        createdAt: true,
        classSubject: {
          select: {
            id: true,
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            schoolClass: {
              select: {
                id: true,
                name: true,
                division: true,
              },
            },
          },
        },
      },
    }),

    prisma.studyMaterial.count({ where }),
  ]);
}

export function findTeacherStudyMaterialById(
  teacherId,
  institutionId,
  materialId,
) {
  return prisma.studyMaterial.findFirst({
    where: {
      id: materialId,
      institutionId,
      uploadedBy: teacherId,
      classSubject: {
        institutionId,
        teacherId,
        schoolClass: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
      createdAt: true,
      classSubject: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          schoolClass: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
      },
    },
  });
}
