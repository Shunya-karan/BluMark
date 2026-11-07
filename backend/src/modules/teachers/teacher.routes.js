
import { Router } from "express";

import * as controller from "./teacher.controller.js";

import authenticate from "../../middleware/authenticate.js";
import authorizeRoles from "../../middleware/authorize.js";
import validate from "../../middleware/validate.js";

import {
  profileUpdateSchema,
  classParamSchema,
  classStudentParamSchema,
  classSubjectParamSchema,
  studentDirectoryQuerySchema,
  attendanceHistoryQuerySchema,
  attendanceSessionParamSchema,
  sessionAttendanceQuerySchema,
  timetableWeekdaySchema,
  studyMaterialParamSchema,
  studyMaterialQuerySchema,
  createAttendanceSessionSchema,
  attendanceRecordParamSchema,
  manualAttendanceSchema,
  correctAttendanceSchema,
  bulkManualAttendanceSchema,
bulkUpdateAttendanceSchema,
} from "./teacher.validation.js";

const router = Router();

// TEACHER AUTHORIZATION

router.use(authenticate, authorizeRoles("TEACHER"));


// TEACHER DASHBOARD

router.get("/dashboard", controller.dashboard);

router.get(
  "/dashboard/summary",
  controller.dashboardSummary,
);

router.get(
  "/dashboard/today-schedule",
  controller.todaySchedule,
);

router.get(
  "/dashboard/attendance-summary",
  controller.attendanceSummary,
);

router.get(
  "/dashboard/recent-activity",
  controller.recentActivity,
);

// TEACHER PROFILE

router.get("/profile", controller.getProfile);

router.patch(
  "/profile",
  validate(profileUpdateSchema),
  controller.updateProfile,
);

router.get(
  "/profile/department",
  controller.department,
);

router.get(
  "/profile/subjects",
  controller.subjects,
);

// ASSIGNED CLASSES

router.get(
  "/classes",
  controller.assignedClasses,
);

router.get(
  "/classes/:classId",
  validate(classParamSchema, "params"),
  controller.assignedClass,
);

// CLASS SUBJECTS

router.get(
  "/classes/:classId/subjects",
  validate(classParamSchema, "params"),
  controller.classSubjects,
);

router.get(
  "/classes/:classId/subjects/:subjectId",
  validate(classSubjectParamSchema, "params"),
  controller.classSubject,
);

// CLASS STATISTICS

router.get(
  "/classes/:classId/statistics",
  validate(classParamSchema, "params"),
  controller.classStatistics,
);

// STUDENT DIRECTORY

// Paginated and searchable student directory.
// Keep this route separate from the existing /students endpoint.

router.get(
  "/classes/:classId/students/directory",
  validate(classParamSchema, "params"),
  validate(studentDirectoryQuerySchema, "query"),
  controller.classStudentDirectory,
);

// Existing complete student list
router.get(
  "/classes/:classId/students",
  validate(classParamSchema, "params"),
  controller.classStudents,
);

// Existing individual student details
router.get(
  "/classes/:classId/students/:studentId",
  validate(classStudentParamSchema, "params"),
  controller.classStudent,
);

// ATTENDANCE HISTORY

router.get(
  "/attendance/history",
  validate(attendanceHistoryQuerySchema, "query"),
  controller.attendanceHistory,
);

router.get(
  "/attendance/sessions/:sessionId",
  validate(attendanceSessionParamSchema, "params"),
  controller.attendanceSessionDetails,
);

router.get(
  "/attendance/sessions/:sessionId/records",
  validate(attendanceSessionParamSchema, "params"),
  validate(sessionAttendanceQuerySchema, "query"),
  controller.sessionAttendanceRecords,
);

// TEACHER TIMETABLE

router.get(
  "/timetable",
  controller.weeklyTimetable,
);

router.get(
  "/timetable/day/:weekday",
  validate(timetableWeekdaySchema, "params"),
  controller.timetableByWeekday,
);

//  STUDY MATERIALS

router.get(
  "/study-materials",
  validate(studyMaterialQuerySchema, "query"),
  controller.studyMaterials,
);

router.get(
  "/study-materials/:materialId",
  validate(studyMaterialParamSchema, "params"),
  controller.studyMaterialDetails,
);
// ATTENDANCE SESSION MANAGEMENT

router.post(
  "/attendance/sessions",
  validate(createAttendanceSessionSchema),
  controller.createAttendanceSession,
);

// END ATTENDANCE SESSION
router.patch(
  "/attendance/sessions/:sessionId/end",
  validate(attendanceSessionParamSchema, "params"),
  controller.endAttendanceSession,
);

// GET LIVE ATTENDANCE SESSION
router.get(
  "/attendance/sessions/:sessionId/live",
  validate(attendanceSessionParamSchema, "params"),
  controller.getLiveAttendanceSession,
);

// TEACHER ATTENDANCE OPERATIONS

// Manually mark a student's attendance.
router.post(
  "/attendance/sessions/:sessionId/records/manual",
  validate(attendanceSessionParamSchema, "params"),
  validate(manualAttendanceSchema),
  controller.manuallyMarkStudentAttendance,
);

// Correct an existing attendance record.
router.patch(
  "/attendance/sessions/:sessionId/records/:recordId",
  validate(attendanceRecordParamSchema, "params"),
  validate(correctAttendanceSchema),
  controller.correctStudentAttendance,
);

// ======================================================
// BULK ATTENDANCE ROUTES
// ======================================================

// Bulk mark attendance.
router.post(
  "/attendance/sessions/:sessionId/records/bulk",
  validate(attendanceSessionParamSchema, "params"),
  validate(bulkManualAttendanceSchema),
  controller.bulkMarkStudentsAttendance,
);

// Bulk update attendance.
router.patch(
  "/attendance/sessions/:sessionId/records/bulk",
  validate(attendanceSessionParamSchema, "params"),
  validate(bulkUpdateAttendanceSchema),
  controller.bulkUpdateStudentAttendance,
);

// Get all students with their attendance status.
router.get(
  "/attendance/sessions/:sessionId/attendance",
  validate(attendanceSessionParamSchema, "params"),
  controller.getTeacherSessionAttendanceRoster,
);
export default router;

