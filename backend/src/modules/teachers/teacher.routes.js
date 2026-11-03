import { Router } from "express";
import authenticate from "../../middleware/authenticate.js";
import authorizeRoles from "../../middleware/authorize.js";
import validate from "../../middleware/validate.js";
import * as controller from "./teacher.controller.js";
import { profileUpdateSchema,  classParamSchema,
classStudentParamSchema,
} from "./teacher.validation.js";

const router = Router();

router.use(authenticate, authorizeRoles("TEACHER"));

router.get("/dashboard", controller.dashboard);
router.get("/dashboard/summary", controller.summary);
router.get("/dashboard/today-schedule", controller.todaySchedule);
router.get("/dashboard/attendance-summary", controller.attendanceSummary);
router.get("/dashboard/recent-activity", controller.recentActivity);

router.get("/profile", controller.profile);
router.patch("/profile", validate(profileUpdateSchema), controller.updateProfile);
router.get("/profile/department", controller.department);
router.get("/profile/subjects", controller.subjects);

router.get("/classes",controller.assignedClasses)
router.get("/classes/:classid",controller.assignedClass)
router.get(
  "/classes/:classId/students",
  validate(classParamSchema, "params"),
  controller.classStudents,
);

router.get(
  "/classes/:classId/students/:studentId",
  validate(classStudentParamSchema, "params"),
  controller.classStudent,
);
export default router;
