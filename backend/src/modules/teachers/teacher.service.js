
import * as repository from "./teacher.repository.js";
import AppError from "../../utils/AppError.js";

// ==========================================
// COMMON HELPERS
// ==========================================

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

// ==========================================
// TEACHER PROFILE
// ==========================================

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

// ==========================================
// TEACHER DASHBOARD
// ==========================================

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

// ==========================================
// ASSIGNED CLASSES
// ==========================================

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

// ==========================================
// EXISTING CLASS STUDENTS
// ==========================================

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

// ==========================================
// MODULE 1: CLASS SUBJECTS
// ==========================================

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

// ==========================================
// MODULE 2: CLASS STATISTICS
// ==========================================

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

// ==========================================
// MODULE 3: PAGINATED STUDENT DIRECTORY
// ==========================================

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
