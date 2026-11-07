
import * as repository from "./teacher.repository.js";
import AppError from "../../utils/AppError.js";
import { randomBytes } from "node:crypto";

import {
  uploadStudyMaterial,
  deleteStudyMaterialObject,
  createStudyMaterialDownloadUrl,
} from "../../utils/s3Storage.js";
// COMMON HELPERS

function getTeacherIdentity(user) {
  if (!user?.id || !user?.institutionId || user.role !== "TEACHER") {
    throw new AppError("Teacher account context is invalid", 403);
  }

  return {
    teacherId: user.id,
    institutionId: user.institutionId,
  };
}

async function teacherContext(user) {
  const identity = getTeacherIdentity(user);

  const profile = await repository.findTeacherProfile(
    identity.teacherId,
    identity.institutionId,
  );

  if (!profile) {
    throw new AppError("Teacher account is unavailable", 403);
  }

  return {
    ...identity,
    profile,
  };
}

async function verifyAssignedClass(user, classId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const schoolClass = await repository.findAssignedClassById(
    teacherId,
    institutionId,
    classId,
  );

  if (!schoolClass) {
    throw new AppError(
      "Class not found or you are not assigned to this class",
      404,
    );
  }

  return {
    teacherId,
    institutionId,
    schoolClass,
  };
}
// TEACHER PROFILE
export async function getProfile(user) {
  const { profile } = await teacherContext(user);
  return profile;
}

export async function editProfile(user, data) {
  const { teacherId, institutionId } = getTeacherIdentity(user);

  await teacherContext(user);

  return repository.updateTeacherProfile(
    teacherId,
    institutionId,
    data,
  );
}

export async function getDepartment(user) {
  const { profile } = await teacherContext(user);

  return profile.teacherDetails?.department ?? null;
}

export async function getSubjects(user) {
  const { teacherId, institutionId } = await teacherContext(user);

  return repository.findTeacherAssignments(
    teacherId,
    institutionId,
  );
}

// TEACHER DASHBOARD

export async function getSummary(user) {
  const { teacherId, institutionId } = await teacherContext(user);

  return repository.getTeacherSummary(
    teacherId,
    institutionId,
  );
}

export async function getTodaySchedule(user) {
  const { teacherId, institutionId } = await teacherContext(user);

  // JavaScript: Monday = 1 ... Sunday = 7
  const weekday = new Date().getDay() || 7;

  return repository.findTodayTimetable(
    teacherId,
    institutionId,
    weekday,
  );
}

export async function getAttendanceSummary(user) {
  const { teacherId, institutionId } = await teacherContext(user);

  const records = await repository.findTeacherAttendanceSummary(
    teacherId,
    institutionId,
  );

  const counts = Object.fromEntries(
    records.map((item) => [
      item.status,
      item._count._all,
    ]),
  );

  const present = counts.PRESENT ?? 0;
  const late = counts.LATE ?? 0;
  const absent = counts.ABSENT ?? 0;
  const excused = counts.EXCUSED ?? 0;

  const total = present + late + absent + excused;

  return {
    total,
    present,
    late,
    absent,
    excused,
    attendancePercentage:
      total > 0
        ? Number((((present + late) / total) * 100).toFixed(2))
        : 0,
  };
}

export async function getRecentActivity(user, take = 10) {
  const { teacherId, institutionId } = await teacherContext(user);

  return repository.findTeacherRecentActivity(
    teacherId,
    institutionId,
    take,
  );
}

export async function getDashboard(user) {
  const { teacherId, institutionId, profile } =
    await teacherContext(user);

  const weekday = new Date().getDay() || 7;

  const [
    summary,
    todaySchedule,
    attendanceSummary,
    recentActivity,
  ] = await Promise.all([
    repository.getTeacherSummary(teacherId, institutionId),
    repository.findTodayTimetable(
      teacherId,
      institutionId,
      weekday,
    ),
    repository.findTeacherAttendanceSummary(
      teacherId,
      institutionId,
    ),
    repository.findTeacherRecentActivity(
      teacherId,
      institutionId,
      10,
    ),
  ]);

  const attendanceCounts = Object.fromEntries(
    attendanceSummary.map((item) => [
      item.status,
      item._count._all,
    ]),
  );

  const present = attendanceCounts.PRESENT ?? 0;
  const late = attendanceCounts.LATE ?? 0;
  const absent = attendanceCounts.ABSENT ?? 0;
  const excused = attendanceCounts.EXCUSED ?? 0;

  const total = present + late + absent + excused;

  return {
    profile: {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      employeeId: profile.teacherDetails?.employeeId ?? null,
      department: profile.teacherDetails?.department ?? null,
    },
    summary,
    todaySchedule,
    attendanceSummary: {
      total,
      present,
      late,
      absent,
      excused,
      attendancePercentage:
        total > 0
          ? Number((((present + late) / total) * 100).toFixed(2))
          : 0,
    },
    recentActivity,
  };
}

// ASSIGNED CLASSES

export async function getAssignedClasses(user) {
  const { teacherId, institutionId } = await teacherContext(user);

  const classes = await repository.findAssignedClasses(
    teacherId,
    institutionId,
  );

  return classes.map((item) => item.schoolClass);
}

export async function getAssignedClassById(user, classId) {
  const { schoolClass } = await verifyAssignedClass(user, classId);

  return schoolClass;
}

// EXISTING CLASS STUDENTS

export async function getClassStudents(user, classId) {
  const { teacherId, institutionId, schoolClass } =
    await verifyAssignedClass(user, classId);

  const enrollments = await repository.findClassStudents(
    teacherId,
    institutionId,
    classId,
  );

  return {
    class: schoolClass,
    totalStudents: enrollments.length,
    students: enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      ...enrollment.student,
    })),
  };
}

export async function getClassStudentById(
  user,
  classId,
  studentId,
) {
  const { teacherId, institutionId, schoolClass } =
    await verifyAssignedClass(user, classId);

  const enrollment = await repository.findClassStudentById(
    teacherId,
    institutionId,
    classId,
    studentId,
  );

  if (!enrollment) {
    throw new AppError("Student not found in this class", 404);
  }

  return {
    class: schoolClass,
    enrollmentId: enrollment.id,
    enrolledAt: enrollment.enrolledAt,
    student: enrollment.student,
  };
}

// CLASS SUBJECTS

export async function getClassSubjects(user, classId) {
  const { teacherId, institutionId, schoolClass } =
    await verifyAssignedClass(user, classId);

  const subjects = await repository.findClassSubjects(
    teacherId,
    institutionId,
    classId,
  );

  return {
    class: schoolClass,
    totalSubjects: subjects.length,
    subjects,
  };
}

export async function getClassSubjectById(
  user,
  classId,
  subjectId,
) {
  const { teacherId, institutionId, schoolClass } =
    await verifyAssignedClass(user, classId);

  const assignment = await repository.findClassSubjectById(
    teacherId,
    institutionId,
    classId,
    subjectId,
  );

  if (!assignment) {
    throw new AppError(
      "Subject not found or not assigned to you in this class",
      404,
    );
  }

  return {
    class: schoolClass,
    subject: assignment.subject,
    assignmentId: assignment.id,
  };
}

// MODULE 2: CLASS STATISTICS

export async function getClassStatistics(user, classId) {
  const { teacherId, institutionId, schoolClass } =
    await verifyAssignedClass(user, classId);

  const statistics = await repository.getClassStatistics(
    teacherId,
    institutionId,
    classId,
  );

  return {
    class: schoolClass,
    statistics,
  };
}
// MODULE 3: PAGINATED STUDENT DIRECTORY

export async function getClassStudentsPaginated(
  user,
  classId,
  query,
) {
  const { teacherId, institutionId, schoolClass } =
    await verifyAssignedClass(user, classId);

  const {
    page = 1,
    limit = 10,
    search = "",
    enrollmentStatus = "active",
    sortBy = "fullName",
    sortOrder = "asc",
  } = query;

  const [enrollments, totalRecords] =
    await repository.findClassStudentsPaginated({
      teacherId,
      institutionId,
      classId,
      page,
      limit,
      search: search.trim(),
      enrollmentStatus,
      sortBy,
      sortOrder,
    });

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    class: schoolClass,
    students: enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      enrollmentActive: enrollment.isActive,
      ...enrollment.student,
    })),
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    filters: {
      search,
      enrollmentStatus,
      sortBy,
      sortOrder,
    },
  };
}

//  TEACHER ATTENDANCE HISTORY

export async function getAttendanceHistory(user, query) {
  const { teacherId, institutionId } = await teacherContext(user);

  const {
    page = 1,
    limit = 10,
    classId,
  } = query;

  // Verify class access when filtering by class.
  if (classId) {
    await verifyAssignedClass(user, classId);
  }

  const [sessions, totalRecords] =
    await repository.findTeacherAttendanceSessions({
      teacherId,
      institutionId,
      page,
      limit,
      classId,
    });

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    sessions,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getAttendanceSessionDetails(user, sessionId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const session = await repository.findTeacherAttendanceSessionById(
    teacherId,
    institutionId,
    sessionId,
  );

  if (!session) {
    throw new AppError("Attendance session not found", 404);
  }

  return session;
}

export async function getSessionAttendanceRecords(
  user,
  sessionId,
  query,
) {
  const { teacherId, institutionId } = await teacherContext(user);

  // Verify that the session belongs to this teacher.
  const session = await repository.findTeacherAttendanceSessionById(
    teacherId,
    institutionId,
    sessionId,
  );

  if (!session) {
    throw new AppError("Attendance session not found", 404);
  }

  const {
    page = 1,
    limit = 10,
    status,
  } = query;

  const [records, totalRecords] =
    await repository.findSessionAttendanceRecords({
      institutionId,
      sessionId,
      page,
      limit,
      status,
    });

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    session: {
      id: session.id,
      sessionCode: session.sessionCode,
      status: session.status,
    },
    records,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// MODULE 5: TEACHER TIMETABLE

export async function getWeeklyTimetable(user) {
  const { teacherId, institutionId } = await teacherContext(user);

  const timetable = await repository.findTeacherWeeklyTimetable(
    teacherId,
    institutionId,
  );

  const weekdayNames = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };

  const groupedTimetable = Object.fromEntries(
    Object.entries(weekdayNames).map(([day, name]) => [
      name,
      timetable.filter((slot) => slot.weekday === Number(day)),
    ]),
  );

  return {
    totalSlots: timetable.length,
    timetable: groupedTimetable,
  };
}

export async function getTimetableByWeekday(user, weekday) {
  const { teacherId, institutionId } = await teacherContext(user);

  const timetable = await repository.findTeacherTimetableByWeekday(
    teacherId,
    institutionId,
    weekday,
  );

  const weekdayNames = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };

  return {
    weekday,
    dayName: weekdayNames[weekday],
    totalSlots: timetable.length,
    timetable,
  };
}

// MODULE 6: TEACHER STUDY MATERIALS

export async function getTeacherStudyMaterials(user, query) {
  const { teacherId, institutionId } = await teacherContext(user);

  const {
    page = 1,
    limit = 10,
    search = "",
    classId,
  } = query;

  if (classId) {
    await verifyAssignedClass(user, classId);
  }

  const [materials, totalRecords] =
    await repository.findTeacherStudyMaterials({
      teacherId,
      institutionId,
      page,
      limit,
      search: search.trim(),
      classId,
    });

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    materials,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getTeacherStudyMaterialById(user, materialId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const material = await repository.findTeacherStudyMaterialById(
    teacherId,
    institutionId,
    materialId,
  );

  if (!material) {
    throw new AppError(
      "Study material not found or you do not have access",
      404,
    );
  }

  return material;
}


// ATTENDANCE SESSION MANAGEMENT

export async function createAttendanceSession(user, data) {
  const { teacherId, institutionId } = await teacherContext(user);

  const {
    classSubjectId,
    timetableSlotId,
    durationMinutes = 60,
  } = data;

  // 1. Verify teacher's subject assignment.
  const assignment = await repository.findTeacherClassSubject(
    teacherId,
    institutionId,
    classSubjectId,
  );

  if (!assignment) {
    throw new AppError(
      "Subject not found or you are not assigned to teach it",
      404,
    );
  }

  // 2. Verify optional timetable slot.
  if (timetableSlotId) {
    const slot = await repository.findTeacherTimetableSlot(
      teacherId,
      institutionId,
      classSubjectId,
      timetableSlotId,
    );

    if (!slot) {
      throw new AppError(
        "Timetable slot not found or does not belong to this subject",
        404,
      );
    }
  }

  // 3. Generate secure session credentials.
  const sessionCode = randomBytes(9).toString("base64url");
  const bleTokenSeed = randomBytes(32).toString("hex");

  // 4. Calculate session expiry.
  const startsAt = new Date();

  const expiresAt = new Date(
    startsAt.getTime() + durationMinutes * 60 * 1000,
  );

  // 5. Create session with concurrency protection.
  const result = await repository.createTeacherAttendanceSession({
    teacherId,
    institutionId,
    classSubjectId,
    timetableSlotId: timetableSlotId ?? null,
    sessionCode,
    bleTokenSeed,
    startsAt,
    expiresAt,
  });

  if (result.conflict) {
    throw new AppError(
      "Please stop your current attendance session before starting a new one.",
      409,
    );
  }

  return {
    message: "Attendance session started successfully",
    session: result.session,
  };
}


// END ATTENDANCE SESSION
export async function endAttendanceSession(user, sessionId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.endTeacherAttendanceSession({
    teacherId,
    institutionId,
    sessionId,
  });

  if (result.notFound) {
    throw new AppError("Attendance session not found", 404);
  }

  if (result.conflict) {
    throw new AppError(
      result.status === "EXPIRED"
        ? "This attendance session has already expired"
        : `Attendance session cannot be ended. Current status: ${result.status}`,
      409,
    );
  }

  return {
    message: "Attendance session ended successfully",
    session: result.session,
  };
}

// GET LIVE ATTENDANCE SESSION
export async function getLiveAttendanceSession(user, sessionId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.findTeacherLiveAttendanceSession({
    teacherId,
    institutionId,
    sessionId,
  });

  if (!result) {
    throw new AppError("Attendance session not found", 404);
  }

  const now = new Date();

  const remainingSeconds =
    result.session.status === "ACTIVE"
      ? Math.max(
          0,
          Math.floor(
            (new Date(result.session.expiresAt).getTime() - now.getTime()) /
              1000,
          ),
        )
      : 0;

  return {
    ...result,
    remainingSeconds,
  };
}

// TEACHER ATTENDANCE OPERATIONS

// Manually mark student attendance.
export async function manuallyMarkStudentAttendance(user, sessionId, data) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.manuallyMarkStudentAttendance({
    teacherId,
    institutionId,
    sessionId,
    studentId: data.studentId,
    status: data.status,
    notes: data.notes,
  });

  if (result.notFound) {
    throw new AppError("Attendance session not found", 404);
  }

  if (result.studentNotEnrolled) {
    throw new AppError(
      "Student is not actively enrolled in this session's class",
      404,
    );
  }

  if (result.alreadyMarked) {
    throw new AppError(
      "Attendance has already been marked for this student. Use the correction endpoint instead.",
      409,
    );
  }

  if (result.conflict) {
    throw new AppError(
      result.reason === "SESSION_EXPIRED"
        ? "Attendance session has expired"
        : `Attendance cannot be marked. Session status: ${result.status}`,
      409,
    );
  }

  return {
    message: "Student attendance marked successfully",
    record: result.record,
  };
}

// Correct student attendance.
export async function correctStudentAttendance(
  user,
  sessionId,
  recordId,
  data,
) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.correctStudentAttendance({
    teacherId,
    institutionId,
    sessionId,
    recordId,
    status: data.status,
    notes: data.notes,
  });

  if (result.notFound) {
    throw new AppError("Attendance session not found", 404);
  }

  if (result.recordNotFound) {
    throw new AppError(
      "Attendance record not found in this session",
      404,
    );
  }

  return {
    message: "Attendance record corrected successfully",
    record: result.record,
  };
}

// BULK ATTENDANCE SERVICES

// Bulk mark attendance.
export async function bulkMarkStudentsAttendance(user, sessionId, data) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.bulkMarkStudentsAttendance({
    teacherId,
    institutionId,
    sessionId,
    records: data.records,
  });

  if (result.notFound) {
    throw new AppError("Attendance session not found", 404);
  }

  if (result.invalidStudents) {
    throw new AppError(
      "Some students are not actively enrolled in this class",
      400,
      { studentIds: result.invalidStudents },
    );
  }

  if (result.alreadyMarked) {
    throw new AppError(
      "Attendance already exists for some students. Use bulk edit instead.",
      409,
      { existingRecords: result.alreadyMarked },
    );
  }

  if (result.conflict) {
    throw new AppError(
      result.reason === "SESSION_EXPIRED"
        ? "Attendance session has expired"
        : "Attendance session is not active",
      409,
    );
  }

  return {
    message: "Bulk attendance marked successfully",
    totalMarked: result.records.length,
    records: result.records,
  };
}


// Bulk edit attendance.
export async function bulkUpdateStudentAttendance(user, sessionId, data) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.bulkUpdateStudentAttendance({
    teacherId,
    institutionId,
    sessionId,
    records: data.records,
  });

  if (result.notFound) {
    throw new AppError("Attendance session not found", 404);
  }

  if (result.invalidRecords) {
    throw new AppError(
      "Some attendance records do not belong to this session",
      404,
      { recordIds: result.invalidRecords },
    );
  }

  return {
    message: "Bulk attendance updated successfully",
    totalUpdated: result.records.length,
    records: result.records,
  };
}


// Get full class attendance roster.
export async function getTeacherSessionAttendanceRoster(user, sessionId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const result = await repository.findTeacherSessionAttendanceRoster({
    teacherId,
    institutionId,
    sessionId,
  });

  if (!result) {
    throw new AppError("Attendance session not found", 404);
  }

  const recordsByStudent = new Map(
    result.attendanceRecords.map((record) => [
      record.studentId,
      record,
    ]),
  );

  const students = result.enrollments.map(({ student }) => {
    const record = recordsByStudent.get(student.id);

    return {
      ...student,
      attendance: record
        ? {
            recordId: record.id,
            status: record.status,
            method: record.method,
            markedAt: record.markedAt,
            notes: record.notes,
          }
        : {
            recordId: null,
            status: "UNMARKED",
            method: null,
            markedAt: null,
            notes: null,
          },
    };
  });

  const summary = {
    totalStudents: students.length,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    unmarked: 0,
  };

  for (const student of students) {
    const status = student.attendance.status.toLowerCase();

    if (status === "unmarked") {
      summary.unmarked++;
    } else if (Object.hasOwn(summary, status)) {
      summary[status]++;
    }
  }

  return {
    session: result.session,
    summary,
    students,
  };
}

// ======================================================
// STUDY MATERIAL MANAGEMENT SERVICES
// ======================================================

export async function uploadTeacherStudyMaterial(user, data, file) {
  if (!file) {
    throw new AppError("Please select a file to upload", 400);
  }

  const { teacherId, institutionId } = await teacherContext(user);

  const assignment = await repository.findTeacherClassSubject(
    teacherId,
    institutionId,
    data.classSubjectId,
  );

  if (!assignment) {
    throw new AppError(
      "Class subject not found or you are not assigned to teach it",
      404,
    );
  }

  const uploaded = await uploadStudyMaterial({
    file,
    institutionId,
    classSubjectId: data.classSubjectId,
  });

  try {
    const material = await repository.createTeacherStudyMaterial({
      institutionId,
      classSubjectId: data.classSubjectId,
      uploadedBy: teacherId,
      title: data.title,
      description: data.description ?? null,
      ...uploaded,
    });

    return {
      message: "Study material uploaded successfully",
      material: {
        ...material,
        downloadUrl: await createStudyMaterialDownloadUrl(
          material.storageKey,
        ),
      },
    };
  } catch (error) {
    // Remove the uploaded object if the database insert fails.
    await deleteStudyMaterialObject(uploaded.storageKey).catch(() => {});
    throw error;
  }
}

export async function updateTeacherStudyMaterial(
  user,
  materialId,
  data,
  file,
) {
  const { teacherId, institutionId } = await teacherContext(user);

  const existing = await repository.findTeacherStudyMaterialForManagement({
    materialId,
    teacherId,
    institutionId,
  });

  if (!existing) {
    throw new AppError("Study material not found", 404);
  }

  let uploaded = null;

  if (file) {
    uploaded = await uploadStudyMaterial({
      file,
      institutionId,
      classSubjectId: existing.classSubjectId,
    });
  }

  try {
    const material = await repository.updateTeacherStudyMaterial({
      materialId,
      institutionId,
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(uploaded ?? {}),
      },
    });

    // Delete the old S3 object only after the database update succeeds.
    if (uploaded && existing.storageKey) {
      await deleteStudyMaterialObject(existing.storageKey).catch((error) => {
        // The database already points to the new file. Log this for cleanup.
        console.error("Old study material S3 object cleanup failed:", error);
      });
    }

    return {
      message: "Study material updated successfully",
      material: {
        ...material,
        downloadUrl: await createStudyMaterialDownloadUrl(
          uploaded?.storageKey ?? existing.storageKey,
        ),
      },
    };
  } catch (error) {
    if (uploaded) {
      await deleteStudyMaterialObject(uploaded.storageKey).catch(() => {});
    }
    throw error;
  }
}

export async function deleteTeacherStudyMaterial(user, materialId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const existing = await repository.findTeacherStudyMaterialForManagement({
    materialId,
    teacherId,
    institutionId,
  });

  if (!existing) {
    throw new AppError("Study material not found", 404);
  }

  await repository.deleteTeacherStudyMaterial(materialId);

  if (existing.storageKey) {
    try {
      await deleteStudyMaterialObject(existing.storageKey);
    } catch (error) {
      // The database row is gone; log the orphaned S3 object for cleanup.
      console.error("Study material S3 deletion failed:", error);
    }
  }

  return {
    message: "Study material deleted successfully",
    materialId,
  };
}

export async function getTeacherStudyMaterialDownloadUrl(user, materialId) {
  const { teacherId, institutionId } = await teacherContext(user);

  const material = await repository.findTeacherStudyMaterialForManagement({
    materialId,
    teacherId,
    institutionId,
  });

  if (!material) {
    throw new AppError("Study material not found", 404);
  }

  if (!material.storageKey) {
    throw new AppError(
      "This material does not have an S3 file attached",
      404,
    );
  }

  return {
    materialId: material.id,
    downloadUrl: await createStudyMaterialDownloadUrl(material.storageKey),
    expiresIn: Number(process.env.AWS_S3_SIGNED_URL_EXPIRY || 300),
  };
}