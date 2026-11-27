
import { Router } from "express";

import authenticate from "../../../middleware/authenticate.js";
import authorizeRoles from "../../../middleware/authorize.js";
import validate from "../../../middleware/validate.js";

import * as controller from "./user.controller.js";

import {
  profileIdParamSchema,
  studentListQuerySchema,
  teacherListQuerySchema,
  updateUserStatusSchema,
  assignEnrollmentSchema,
  updateStudentSchema,
  updateTeacherSchema,
} from "./user.validation.js";

const router = Router();


router.use(
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
);

// STUDENTS

router.get(
  "/students",
  validate(studentListQuerySchema, "query"),
  controller.listStudents,
);

router.get(
  "/students/:profileId",
  validate(profileIdParamSchema, "params"),
  controller.getStudent,
);

router.patch(
  "/students/:profileId",
  validate(profileIdParamSchema, "params"),
  validate(updateStudentSchema),
  controller.updateStudent,
);

// STUDENT ENROLLMENTS

router.get(
  "/students/:profileId/enrollment",
  validate(profileIdParamSchema, "params"),
  controller.getStudentEnrollment,
);

router.put(
  "/students/:profileId/enrollment",
  validate(profileIdParamSchema, "params"),
  validate(assignEnrollmentSchema),
  controller.assignStudentEnrollment,
);

// TEACHERS

router.get(
  "/teachers",
  validate(teacherListQuerySchema, "query"),
  controller.listTeachers,
);

router.get(
  "/teachers/:profileId",
  validate(profileIdParamSchema, "params"),
  controller.getTeacher,
);

router.patch(
  "/teachers/:profileId",
  validate(profileIdParamSchema, "params"),
  validate(updateTeacherSchema),
  controller.updateTeacher,
);

// ACCOUNT STATUS

router.patch(
  "/:profileId/status",
  validate(profileIdParamSchema, "params"),
  validate(updateUserStatusSchema),
  controller.updateUserStatus,
);

export default router;
