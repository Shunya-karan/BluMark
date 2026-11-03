import AppError from "../../utils/AppError.js";
import * as repository from "./teacher.repository.js";

function getTeacherIdentity(user) {
  if (!user?.id || !user?.institutionId || user.role !== "TEACHER") {
    throw new AppError("Teacher account context is invalid", 403);
  }
  return { teacherId: user.id, institutionId: user.institutionId };
}

function toProfile(profile) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    isActive: profile.isActive,
    employeeId: profile.teacherDetails?.employeeId ?? null,
    department: profile.teacherDetails?.department ?? null,
    institution: profile.institution,
  };
}

async function teacherContext(user) {
  const identity = getTeacherIdentity(user);
  const profile = await repository.findTeacherProfile(
    identity.teacherId,
    identity.institutionId,
  );
  if (!profile) throw new AppError("Teacher account is unavailable", 403);
  return { ...identity, profile };
}

function attendanceCounts(groups) {
  const counts = Object.fromEntries(
    groups.map((item) => [item.status, item._count._all]),
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
    attendanceRate: total
      ? Number((((present + late + excused) / total) * 100).toFixed(2))
      : 0,
  };
}

export async function getProfile(user) {
  const context = await teacherContext(user);
  return toProfile(context.profile);
}

export async function editProfile(user, input) {
  const context = await teacherContext(user);
  const updated = await repository.updateTeacherProfile(
    context.teacherId,
    context.institutionId,
    input,
  );
  return toProfile(updated);
}

export async function getDepartment(user) {
  const context = await teacherContext(user);
  return context.profile.teacherDetails?.department ?? null;
}

export async function getSubjects(user) {
  const context = await teacherContext(user);
  return repository.findTeacherAssignments(
    context.teacherId,
    context.institutionId,
  );
}

export async function getSummary(user) {
  const context = await teacherContext(user);
  return repository.getTeacherSummary(
    context.teacherId,
    context.institutionId,
  );
}

export async function getTodaySchedule(user) {
  const context = await teacherContext(user);
  // Timetable weekday convention in the database: Monday=1 ... Sunday=7.
  const weekday = new Date().getDay() || 7;
  return repository.findTodayTimetable(
    context.teacherId,
    context.institutionId,
    weekday,
  );
}

export async function getAttendanceSummary(user) {
  const context = await teacherContext(user);
  const groups = await repository.findTeacherAttendanceSummary(
    context.teacherId,
    context.institutionId,
  );
  return attendanceCounts(groups);
}

export async function getRecentActivity(user) {
  const context = await teacherContext(user);
  return repository.findTeacherRecentActivity(
    context.teacherId,
    context.institutionId,
  );
}

export async function getDashboard(user) {
  const context = await teacherContext(user);
  const [summary, todaySchedule, attendanceGroups, recentActivity] =
    await Promise.all([
      repository.getTeacherSummary(context.teacherId, context.institutionId),
      repository.findTodayTimetable(
        context.teacherId,
        context.institutionId,
        new Date().getDay() || 7,
      ),
      repository.findTeacherAttendanceSummary(
        context.teacherId,
        context.institutionId,
      ),
      repository.findTeacherRecentActivity(
        context.teacherId,
        context.institutionId,
        5,
      ),
    ]);

  return {
    profile: toProfile(context.profile),
    summary,
    todaySchedule,
    attendance: attendanceCounts(attendanceGroups),
    recentActivity,
  };
}



// TEACHER CLASS MANAGEMENT

export async function getAssignedClasses(user) {
  const { teacherId, institutionId } = getTeacherIdentity(user);

  // Verify that the teacher account is active.
  await teacherContext(user);

  const classes = await repository.findAssignedClasses(
    teacherId,
    institutionId,
  );

  return classes.map((item) => item.schoolClass);
}

export async function getAssignedClassById(user, classId) {
  const { teacherId, institutionId } = getTeacherIdentity(user);

  await teacherContext(user);

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

  return schoolClass;
}

export async function getClassStudents(user, classId) {
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

export async function getClassStudentById(user, classId, studentId) {
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