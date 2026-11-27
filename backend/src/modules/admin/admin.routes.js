
import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorizeRoles from "../../middleware/authorize.js";
import validate from "../../middleware/validate.js";

import * as controller from "./admin.controller.js";

import {
  updateAdminProfileSchema,
  recentActivityQuerySchema,
  attendanceSessionsQuerySchema,
  sessionIdParamSchema,
} from "./admin.validation.js";

const router = Router();

router.use(
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
);

// DASHBOARD
router.get("/dashboard", controller.dashboard);

router.get(
  "/dashboard/summary",
  controller.dashboardSummary,
);

router.get(
  "/dashboard/recent-activity",
  validate(recentActivityQuerySchema, "query"),
  controller.recentActivity,
);

// ADMIN PROFILE
router.get("/profile", controller.getProfile);

router.patch(
  "/profile",
  validate(updateAdminProfileSchema),
  controller.updateProfile,
);

// ATTENDANCE
router.get(
  "/attendance/sessions",
  validate(attendanceSessionsQuerySchema, "query"),
  controller.listAttendanceSessions,
);

router.get(
  "/attendance/sessions/:sessionId",
  validate(sessionIdParamSchema, "params"),
  controller.getAttendanceSessionDetails,
);

export default router;

