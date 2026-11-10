
import { Router } from "express";

import authenticate from "../../../middleware/authenticate.js";
import authorizeRoles from "../../../middleware/authorize.js";
import validate from "../../../middleware/validate.js";

import * as controller from "./academic.controller.js";

import {
  departmentIdParamSchema,
  classIdParamSchema,
  subjectIdParamSchema,
  assignmentIdParamSchema,

  createDepartmentSchema,
  updateDepartmentSchema,
  departmentListQuerySchema,

  createClassSchema,
  updateClassSchema,
  classListQuerySchema,

  createSubjectSchema,
  updateSubjectSchema,
  subjectListQuerySchema,

  createAssignmentSchema,
  reassignTeacherSchema,
  assignmentListQuerySchema,
} from "./academic.validation.js";

const router = Router();

router.use(
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
);

// DEPARTMENTS

router.post(
  "/departments",
  validate(createDepartmentSchema),
  controller.createDepartment,
);

router.get(
  "/departments",
  validate(departmentListQuerySchema, "query"),
  controller.listDepartments,
);

router.get(
  "/departments/:departmentId",
  validate(departmentIdParamSchema, "params"),
  controller.getDepartment,
);

router.patch(
  "/departments/:departmentId",
  validate(departmentIdParamSchema, "params"),
  validate(updateDepartmentSchema),
  controller.updateDepartment,
);

// CLASSES

router.post(
  "/classes",
  validate(createClassSchema),
  controller.createClass,
);

router.get(
  "/classes",
  validate(classListQuerySchema, "query"),
  controller.listClasses,
);

router.get(
  "/classes/:classId",
  validate(classIdParamSchema, "params"),
  controller.getClass,
);

router.patch(
  "/classes/:classId",
  validate(classIdParamSchema, "params"),
  validate(updateClassSchema),
  controller.updateClass,
);

// SUBJECTS

router.post(
  "/subjects",
  validate(createSubjectSchema),
  controller.createSubject,
);

router.get(
  "/subjects",
  validate(subjectListQuerySchema, "query"),
  controller.listSubjects,
);

router.get(
  "/subjects/:subjectId",
  validate(subjectIdParamSchema, "params"),
  controller.getSubject,
);

router.patch(
  "/subjects/:subjectId",
  validate(subjectIdParamSchema, "params"),
  validate(updateSubjectSchema),
  controller.updateSubject,
);

// TEACHER ASSIGNMENTS

router.post(
  "/assignments",
  validate(createAssignmentSchema),
  controller.createAssignment,
);

router.get(
  "/assignments",
  validate(assignmentListQuerySchema, "query"),
  controller.listAssignments,
);

router.get(
  "/assignments/:assignmentId",
  validate(assignmentIdParamSchema, "params"),
  controller.getAssignment,
);

router.patch(
  "/assignments/:assignmentId/teacher",
  validate(assignmentIdParamSchema, "params"),
  validate(reassignTeacherSchema),
  controller.reassignTeacher,
);

export default router;
