import { Router } from "express";
import authenticate from "../../middleware/authenticate.js";
import authorizeRoles from "../../middleware/authorize.js";
import validate from "../../middleware/validate.js";
import * as controller from "./student.controller.js";
import {
  attendanceCalendarSchema,
  attendanceHistorySchema,
  materialParamSchema,
  notificationParamSchema,
  notificationsSchema,
  profileUpdateSchema,
  registerDeviceSchema,
  replacementRequestSchema,
  studyMaterialsSchema,
  subjectParamSchema,
} from "./student.validation.js";

const router = Router();

router.use(authenticate, authorizeRoles("STUDENT"));

router.get("/dashboard", controller.dashboard);
router.get("/profile", controller.profile);
router.patch("/profile", validate(profileUpdateSchema), controller.updateProfile);

router.get("/attendance/summary", controller.attendanceSummary);
router.get("/attendance/history", validate(attendanceHistorySchema, "query"), controller.attendanceHistory);
router.get("/attendance/calendar", validate(attendanceCalendarSchema, "query"), controller.attendanceCalendar);
router.get("/attendance/subjects", controller.attendanceSubjects);

router.get("/timetable", controller.timetable);
router.get("/timetable/today", controller.timetableToday);
router.get("/timetable/upcoming", controller.timetableUpcoming);

router.get("/subjects", controller.subjects);
router.get("/subjects/:subjectId", validate(subjectParamSchema, "params"), controller.subject);

router.get("/study-materials", validate(studyMaterialsSchema, "query"), controller.studyMaterials);
router.get("/study-materials/:materialId", validate(materialParamSchema, "params"), controller.studyMaterial);

router.patch("/notifications/read-all", controller.markAllNotificationsRead);
router.get("/notifications", validate(notificationsSchema, "query"), controller.notifications);
router.get("/notifications/:notificationId", validate(notificationParamSchema, "params"), controller.notification);
router.patch("/notifications/:notificationId/read", validate(notificationParamSchema, "params"), controller.markNotificationRead);

router.get("/device", controller.device);
router.post("/device/register", validate(registerDeviceSchema), controller.registerDevice);
router.delete("/device/request-replacement", validate(replacementRequestSchema), controller.requestReplacement);

router.get("/academic-details", controller.academicDetails);
router.get("/enrollment", controller.enrollment);

export default router;
