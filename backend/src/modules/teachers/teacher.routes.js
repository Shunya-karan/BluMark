
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

// MODULE 1: CLASS SUBJECTS

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

// MODULE 2: CLASS STATISTICS

router.get(
  "/classes/:classId/statistics",
  validate(classParamSchema, "params"),
  controller.classStatistics,
);

// MODULE 3: STUDENT DIRECTORY

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

// MODULE 4: ATTENDANCE HISTORY

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

// MODULE 5: TEACHER TIMETABLE

router.get(
  "/timetable",
  controller.weeklyTimetable,
);

router.get(
  "/timetable/day/:weekday",
  validate(timetableWeekdaySchema, "params"),
  controller.timetableByWeekday,
);

// MODULE 6: STUDY MATERIALS

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
export default router;
