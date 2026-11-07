
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


//  PAGINATED STUDENT DIRECTORY


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


//TEACHER ATTENDANCE HISTORY

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

//  TEACHER TIMETABLE

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

//TEACHER STUDY MATERIALS

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


// export async function endTeacherAttendanceSession({
//   teacherId,
//   institutionId,
//   sessionId,
// }) {
//   return prisma.$transaction(async (tx) => {
//     const session = await tx.attendanceSession.findFirst({
//       where: {
//         id: sessionId,
//         teacherId,
//         institutionId,
//       },
//       select: {
//         id: true,
//         status: true,
//         expiresAt: true,
//       },
//     });

//     if (!session) {
//       return { notFound: true };
//     }

//     if (session.status !== "ACTIVE") {
//       return {
//         conflict: true,
//         status: session.status,
//       };
//     }

//     const now = new Date();

//     // An overdue session should be expired, not completed.
//     if (session.expiresAt <= now) {
//       await tx.attendanceSession.updateMany({
//         where: {
//           id: sessionId,
//           teacherId,
//           institutionId,
//           status: "ACTIVE",
//         },
//         data: {
//           status: "EXPIRED",
//           endedAt: now,
//         },
//       });

//       return {
//         conflict: true,
//         status: "EXPIRED",
//       };
//     }

//     const result = await tx.attendanceSession.updateMany({
//       where: {
//         id: sessionId,
//         teacherId,
//         institutionId,
//         status: "ACTIVE",
//       },
//       data: {
//         status: "COMPLETED",
//         endedAt: now,
//       },
//     });

//     if (result.count === 0) {
//       return {
//         conflict: true,
//         status: "ALREADY_ENDED",
//       };
//     }

//     const updatedSession = await tx.attendanceSession.findFirst({
//       where: {
//         id: sessionId,
//         teacherId,
//         institutionId,
//       },
//       select: {
//         id: true,
//         sessionCode: true,
//         status: true,
//         startsAt: true,
//         expiresAt: true,
//         endedAt: true,
//         classSubject: {
//           select: {
//             subject: {
//               select: {
//                 id: true,
//                 name: true,
//                 code: true,
//               },
//             },
//             schoolClass: {
//               select: {
//                 id: true,
//                 name: true,
//                 division: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     return {
//       conflict: false,
//       session: updatedSession,
//     };
//   });
// }



 // ATTENDANCE SESSION MANAGEMENT

async function lockTeacherSession(tx, teacherId) {
  await tx.$queryRaw`
    SELECT 1::int AS locked
    FROM (
      SELECT pg_advisory_xact_lock(
        hashtextextended(${teacherId}, 0)
      )
    ) AS lock_result
  `;
}

// Find teacher's assigned subject.
export function findTeacherClassSubject(
  teacherId,
  institutionId,
  classSubjectId,
) {
  return prisma.classSubject.findFirst({
    where: {
      id: classSubjectId,
      teacherId,
      institutionId,
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
  });
}

// Verify optional timetable slot.
export function findTeacherTimetableSlot(
  teacherId,
  institutionId,
  classSubjectId,
  timetableSlotId,
) {
  return prisma.timetableSlot.findFirst({
    where: {
      id: timetableSlotId,
      institutionId,
      classSubjectId,
      isActive: true,
      classSubject: {
        teacherId,
        institutionId,
        schoolClass: { isActive: true },
        subject: { isActive: true },
      },
    },
    select: {
      id: true,
      classSubjectId: true,
      weekday: true,
      startTime: true,
      endTime: true,
      room: true,
    },
  });
}

// Create and start attendance session.
export async function createTeacherAttendanceSession({
  teacherId,
  institutionId,
  classSubjectId,
  timetableSlotId,
  sessionCode,
  bleTokenSeed,
  startsAt,
  expiresAt,
}) {
  return prisma.$transaction(async (tx) => {
    // Serialize session creation for this teacher.
    await lockTeacherSession(tx, teacherId);

    const now = new Date();

    // Expire any overdue active sessions.
    await tx.attendanceSession.updateMany({
      where: {
        teacherId,
        institutionId,
        status: "ACTIVE",
        expiresAt: { lte: now },
      },
      data: {
        status: "EXPIRED",
        endedAt: now,
      },
    });

    // Enforce one active session per teacher.
    const activeSession = await tx.attendanceSession.findFirst({
      where: {
        teacherId,
        institutionId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        classSubject: {
          select: {
            subject: {
              select: { name: true },
            },
            schoolClass: {
              select: {
                name: true,
                division: true,
              },
            },
          },
        },
      },
    });

    if (activeSession) {
      return {
        conflict: true,
        activeSession,
      };
    }

    const session = await tx.attendanceSession.create({
      data: {
        institutionId,
        teacherId,
        classSubjectId,
        timetableSlotId: timetableSlotId ?? null,
        sessionCode,
        bleTokenSeed,
        startsAt,
        expiresAt,
        status: "ACTIVE",
      },
      select: {
        id: true,
        sessionCode: true,
        status: true,
        startsAt: true,
        expiresAt: true,
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

    return {
      conflict: false,
      session,
    };
  });
}

// End an active attendance session.
export async function endTeacherAttendanceSession({
  teacherId,
  institutionId,
  sessionId,
}) {
  return prisma.$transaction(async (tx) => {
    await lockTeacherSession(tx, teacherId);

    const session = await tx.attendanceSession.findFirst({
      where: {
        id: sessionId,
        teacherId,
        institutionId,
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!session) {
      return { notFound: true };
    }

    if (session.status !== "ACTIVE") {
      return {
        conflict: true,
        status: session.status,
      };
    }

    const now = new Date();

    const newStatus =
      session.expiresAt <= now ? "EXPIRED" : "COMPLETED";

    await tx.attendanceSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status: newStatus,
        endedAt: now,
      },
    });

    if (newStatus === "EXPIRED") {
      return {
        conflict: true,
        status: "EXPIRED",
      };
    }

    const updatedSession = await tx.attendanceSession.findFirst({
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

    return {
      conflict: false,
      session: updatedSession,
    };
  });
}

// Get live attendance session details.
export async function findTeacherLiveAttendanceSession({
  teacherId,
  institutionId,
  sessionId,
}) {
  return prisma.$transaction(async (tx) => {
    await lockTeacherSession(tx, teacherId);

    const session = await tx.attendanceSession.findFirst({
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
      },
    });

    if (!session) {
      return null;
    }

    const now = new Date();

    if (
      session.status === "ACTIVE" &&
      session.expiresAt <= now
    ) {
      await tx.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: "EXPIRED",
          endedAt: now,
        },
      });

      session.status = "EXPIRED";
      session.endedAt = now;
    }

    const [details, attendanceGroups] = await Promise.all([
      tx.attendanceSession.findFirst({
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
      }),

      tx.attendanceRecord.groupBy({
        by: ["status"],
        where: {
          institutionId,
          sessionId,
        },
        _count: {
          _all: true,
        },
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

    return {
      session: details,
      attendanceSummary: {
        total: present + late + absent + excused,
        present,
        late,
        absent,
        excused,
      },
    };
  });
}

// TEACHER ATTENDANCE OPERATIONS

// Manually mark attendance for a student.
export async function manuallyMarkStudentAttendance({
  teacherId,
  institutionId,
  sessionId,
  studentId,
  status,
  notes,
}) {
  return prisma.$transaction(async (tx) => {
    await lockTeacherSession(tx, teacherId);

    const session = await tx.attendanceSession.findFirst({
      where: {
        id: sessionId,
        teacherId,
        institutionId,
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        classSubject: {
          select: {
            classId: true,
          },
        },
      },
    });

    if (!session) {
      return { notFound: true };
    }

    if (session.status !== "ACTIVE") {
      return {
        conflict: true,
        reason: "SESSION_NOT_ACTIVE",
        status: session.status,
      };
    }

    const now = new Date();

    if (session.expiresAt <= now) {
      await tx.attendanceSession.update({
        where: { id: sessionId },
        data: {
          status: "EXPIRED",
          endedAt: now,
        },
      });

      return {
        conflict: true,
        reason: "SESSION_EXPIRED",
        status: "EXPIRED",
      };
    }

    const enrollment = await tx.enrollment.findFirst({
      where: {
        institutionId,
        classId: session.classSubject.classId,
        studentId,
        isActive: true,
        student: {
          institutionId,
          role: "STUDENT",
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      return { studentNotEnrolled: true };
    }

    const existingRecord = await tx.attendanceRecord.findFirst({
      where: {
        institutionId,
        sessionId,
        studentId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingRecord) {
      return {
        alreadyMarked: true,
        existingRecord,
      };
    }

    const record = await tx.attendanceRecord.create({
      data: {
        institutionId,
        sessionId,
        studentId,
        status,
        method: "MANUAL",
        markedAt: now,
        notes: notes ?? null,
      },
      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,
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
    });

    return {
      conflict: false,
      record,
    };
  });
}

// Correct an existing attendance record.
export async function correctStudentAttendance({
  teacherId,
  institutionId,
  sessionId,
  recordId,
  status,
  notes,
}) {
  return prisma.$transaction(async (tx) => {
    await lockTeacherSession(tx, teacherId);

    const session = await tx.attendanceSession.findFirst({
      where: {
        id: sessionId,
        teacherId,
        institutionId,
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      return { notFound: true };
    }

    const existingRecord = await tx.attendanceRecord.findFirst({
      where: {
        id: recordId,
        sessionId,
        institutionId,
      },
      select: {
        id: true,
      },
    });

    if (!existingRecord) {
      return { recordNotFound: true };
    }

    const updatedRecord = await tx.attendanceRecord.update({
      where: {
        id: recordId,
      },
      data: {
        status,
        method: "MANUAL",
        ...(notes !== undefined ? { notes } : {}),
      },
      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,
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
    });

    return {
      conflict: false,
      record: updatedRecord,
    };
  });
}


// BULK ATTENDANCE OPERATIONS

// Mark attendance for multiple students.
export async function bulkMarkStudentsAttendance({
  teacherId,
  institutionId,
  sessionId,
  records,
}) {
  return prisma.$transaction(async (tx) => {
    await lockTeacherSession(tx, teacherId);

    const session = await tx.attendanceSession.findFirst({
      where: { id: sessionId, teacherId, institutionId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        classSubject: {
          select: { classId: true },
        },
      },
    });

    if (!session) return { notFound: true };

    if (session.status !== "ACTIVE") {
      return { conflict: true, reason: "SESSION_NOT_ACTIVE" };
    }

    const now = new Date();

    if (session.expiresAt <= now) {
      await tx.attendanceSession.update({
        where: { id: sessionId },
        data: { status: "EXPIRED", endedAt: now },
      });

      return { conflict: true, reason: "SESSION_EXPIRED" };
    }

    const studentIds = records.map((record) => record.studentId);

    const enrollments = await tx.enrollment.findMany({
      where: {
        institutionId,
        classId: session.classSubject.classId,
        studentId: { in: studentIds },
        isActive: true,
        student: {
          institutionId,
          role: "STUDENT",
          isActive: true,
        },
      },
      select: { studentId: true },
    });

    const enrolledIds = new Set(enrollments.map((item) => item.studentId));

    const invalidStudentIds = studentIds.filter(
      (id) => !enrolledIds.has(id),
    );

    if (invalidStudentIds.length > 0) {
      return { invalidStudents: invalidStudentIds };
    }

    const existingRecords = await tx.attendanceRecord.findMany({
      where: {
        institutionId,
        sessionId,
        studentId: { in: studentIds },
      },
      select: {
        studentId: true,
        status: true,
      },
    });

    if (existingRecords.length > 0) {
      return {
        alreadyMarked: existingRecords,
      };
    }

    await tx.attendanceRecord.createMany({
      data: records.map((record) => ({
        institutionId,
        sessionId,
        studentId: record.studentId,
        status: record.status,
        method: "MANUAL",
        markedAt: now,
        notes: record.notes ?? null,
      })),
    });

    const createdRecords = await tx.attendanceRecord.findMany({
      where: {
        institutionId,
        sessionId,
        studentId: { in: studentIds },
      },
      orderBy: { markedAt: "asc" },
      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,
        notes: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentDetails: {
              select: { studentNumber: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      records: createdRecords,
    };
  });
}


// Edit attendance for multiple students.
export async function bulkUpdateStudentAttendance({
  teacherId,
  institutionId,
  sessionId,
  records,
}) {
  return prisma.$transaction(async (tx) => {
    await lockTeacherSession(tx, teacherId);

    const session = await tx.attendanceSession.findFirst({
      where: { id: sessionId, teacherId, institutionId },
      select: { id: true },
    });

    if (!session) return { notFound: true };

    const recordIds = records.map((record) => record.recordId);

    const existingRecords = await tx.attendanceRecord.findMany({
      where: {
        institutionId,
        sessionId,
        id: { in: recordIds },
      },
      select: { id: true },
    });

    const existingIds = new Set(existingRecords.map((item) => item.id));

    const invalidRecordIds = recordIds.filter(
      (id) => !existingIds.has(id),
    );

    if (invalidRecordIds.length > 0) {
      return { invalidRecords: invalidRecordIds };
    }

    for (const record of records) {
      await tx.attendanceRecord.update({
        where: { id: record.recordId },
        data: {
          status: record.status,
          method: "MANUAL",
          ...(record.notes !== undefined
            ? { notes: record.notes }
            : {}),
        },
      });
    }

    const updatedRecords = await tx.attendanceRecord.findMany({
      where: {
        institutionId,
        sessionId,
        id: { in: recordIds },
      },
      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,
        notes: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentDetails: {
              select: { studentNumber: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      records: updatedRecords,
    };
  });
}


// Get every enrolled student and their attendance status.
export async function findTeacherSessionAttendanceRoster({
  teacherId,
  institutionId,
  sessionId,
}) {
  const session = await prisma.attendanceSession.findFirst({
    where: {
      id: sessionId,
      teacherId,
      institutionId,
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      endedAt: true,
      classSubject: {
        select: {
          id: true,
          classId: true,
          subject: {
            select: { id: true, name: true, code: true },
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

  if (!session) return null;

  const [enrollments, attendanceRecords] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        institutionId,
        classId: session.classSubject.classId,
        isActive: true,
        student: {
          institutionId,
          role: "STUDENT",
          isActive: true,
        },
      },
      orderBy: {
        student: { fullName: "asc" },
      },
      select: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentDetails: {
              select: { studentNumber: true },
            },
          },
        },
      },
    }),

    prisma.attendanceRecord.findMany({
      where: {
        institutionId,
        sessionId,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
        method: true,
        markedAt: true,
        notes: true,
      },
    }),
  ]);

  return {
    session,
    enrollments,
    attendanceRecords,
  };
}

// ======================================================
// STUDY MATERIAL MANAGEMENT
// ======================================================

export function createTeacherStudyMaterial(data) {
  return prisma.studyMaterial.create({
    data,
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
      originalFileName: true,
      fileSize: true,
      createdAt: true,
      updatedAt: true,
      classSubject: {
        select: {
          id: true,
          subject: { select: { id: true, name: true, code: true , storageKey: true,} },
          schoolClass: {
            select: { id: true, name: true, division: true, academicYear: true },
          },
        },
      },
    },
  });
}

export function findTeacherStudyMaterialForManagement({
  materialId,
  teacherId,
  institutionId,
}) {
  return prisma.studyMaterial.findFirst({
    where: {
      id: materialId,
      institutionId,
      classSubject: {
        teacherId,
        institutionId,
      },
    },
    select: {
      id: true,
      institutionId: true,
      classSubjectId: true,
      uploadedBy: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
      storageKey: true,
      originalFileName: true,
      fileSize: true,
    },
  });
}

export function updateTeacherStudyMaterial({
  materialId,
  institutionId,
  data,
}) {
  return prisma.studyMaterial.update({
    where: { id: materialId },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
      originalFileName: true,
      fileSize: true,
      createdAt: true,
      updatedAt: true,
      storageKey: true,
    },
  });
}

export function deleteTeacherStudyMaterial(materialId) {
  return prisma.studyMaterial.delete({
    where: { id: materialId },
    select: {
      id: true,
      storageKey: true,
    },
  });
}