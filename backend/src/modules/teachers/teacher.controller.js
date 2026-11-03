
import * as service from "./teacher.service.js";
import sendResponse from "../../utils/apiResponse.js";
import catchAsync from "../../utils/catchAsync.js";

// ==========================================
// TEACHER DASHBOARD
// ==========================================

export const dashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboard(req.user);

  return sendResponse(
    res,
    200,
    "Teacher dashboard retrieved successfully",
    data,
  );
});

export const dashboardSummary = catchAsync(async (req, res) => {
  const data = await service.getSummary(req.user);

  return sendResponse(
    res,
    200,
    "Teacher dashboard summary retrieved successfully",
    data,
  );
});

export const todaySchedule = catchAsync(async (req, res) => {
  const data = await service.getTodaySchedule(req.user);

  return sendResponse(
    res,
    200,
    "Today's schedule retrieved successfully",
    data,
  );
});

export const attendanceSummary = catchAsync(async (req, res) => {
  const data = await service.getAttendanceSummary(req.user);

  return sendResponse(
    res,
    200,
    "Attendance summary retrieved successfully",
    data,
  );
});

export const recentActivity = catchAsync(async (req, res) => {
  const data = await service.getRecentActivity(req.user);

  return sendResponse(
    res,
    200,
    "Recent activity retrieved successfully",
    data,
  );
});

// ==========================================
// TEACHER PROFILE
// ==========================================

export const getProfile = catchAsync(async (req, res) => {
  const data = await service.getProfile(req.user);

  return sendResponse(
    res,
    200,
    "Teacher profile retrieved successfully",
    data,
  );
});

export const updateProfile = catchAsync(async (req, res) => {
  const data = await service.editProfile(req.user, req.body);

  return sendResponse(
    res,
    200,
    "Teacher profile updated successfully",
    data,
  );
});

export const department = catchAsync(async (req, res) => {
  const data = await service.getDepartment(req.user);

  return sendResponse(
    res,
    200,
    "Teacher department retrieved successfully",
    data,
  );
});

export const subjects = catchAsync(async (req, res) => {
  const data = await service.getSubjects(req.user);

  return sendResponse(
    res,
    200,
    "Teacher subjects retrieved successfully",
    data,
  );
});

// ==========================================
// ASSIGNED CLASSES
// ==========================================

export const assignedClasses = catchAsync(async (req, res) => {
  const data = await service.getAssignedClasses(req.user);

  return sendResponse(
    res,
    200,
    "Assigned classes retrieved successfully",
    data,
  );
});

export const assignedClass = catchAsync(async (req, res) => {
  const data = await service.getAssignedClassById(
    req.user,
    req.params.classId,
  );

  return sendResponse(
    res,
    200,
    "Class details retrieved successfully",
    data,
  );
});

// ==========================================
// EXISTING CLASS STUDENTS
// ==========================================

export const classStudents = catchAsync(async (req, res) => {
  const data = await service.getClassStudents(
    req.user,
    req.params.classId,
  );

  return sendResponse(
    res,
    200,
    "Class students retrieved successfully",
    data,
  );
});

export const classStudent = catchAsync(async (req, res) => {
  const data = await service.getClassStudentById(
    req.user,
    req.params.classId,
    req.params.studentId,
  );

  return sendResponse(
    res,
    200,
    "Class student details retrieved successfully",
    data,
  );
});

// ==========================================
// MODULE 1: CLASS SUBJECTS
// ==========================================

export const classSubjects = catchAsync(async (req, res) => {
  const data = await service.getClassSubjects(
    req.user,
    req.params.classId,
  );

  return sendResponse(
    res,
    200,
    "Class subjects retrieved successfully",
    data,
  );
});

export const classSubject = catchAsync(async (req, res) => {
  const data = await service.getClassSubjectById(
    req.user,
    req.params.classId,
    req.params.subjectId,
  );

  return sendResponse(
    res,
    200,
    "Class subject details retrieved successfully",
    data,
  );
});

// ==========================================
// MODULE 2: CLASS STATISTICS
// ==========================================

export const classStatistics = catchAsync(async (req, res) => {
  const data = await service.getClassStatistics(
    req.user,
    req.params.classId,
  );

  return sendResponse(
    res,
    200,
    "Class statistics retrieved successfully",
    data,
  );
});

// ==========================================
// MODULE 3: PAGINATED STUDENT DIRECTORY
// ==========================================

export const classStudentDirectory = catchAsync(async (req, res) => {
  const data = await service.getClassStudentsPaginated(
    req.user,
    req.params.classId,
    req.query,
  );

  return sendResponse(
    res,
    200,
    "Student directory retrieved successfully",
    data,
  );
});
