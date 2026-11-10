
import { z } from "zod";

const uuid = z.string().uuid("Invalid ID");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).default(""),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
};

export const departmentIdParamSchema = z.object({
  departmentId: uuid,
});

export const classIdParamSchema = z.object({
  classId: uuid,
});

export const subjectIdParamSchema = z.object({
  subjectId: uuid,
});

export const assignmentIdParamSchema = z.object({
  assignmentId: uuid,
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30).transform(v => v.toUpperCase()),
}).strict();

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().min(2).max(30).transform(v => v.toUpperCase()).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(v => Object.keys(v).length > 0, {
  message: "Provide at least one field to update",
});

export const departmentListQuerySchema = z.object({
  ...pagination,
  isActive: z.enum(["true", "false", "all"]).default("all"),
}).strict();

export const createClassSchema = z.object({
  name: z.string().trim().min(2).max(120),
  division: z.string().trim().max(30).nullable().optional(),
  academicYear: z.string().trim().min(4).max(20),
  semester: z.coerce.number().int().min(1).max(20).nullable().optional(),
  departmentId: uuid.nullable().optional(),
}).strict();

export const updateClassSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  division: z.string().trim().max(30).nullable().optional(),
  academicYear: z.string().trim().min(4).max(20).optional(),
  semester: z.coerce.number().int().min(1).max(20).nullable().optional(),
  departmentId: uuid.nullable().optional(),
  isActive: z.boolean().optional(),
}).strict().refine(v => Object.keys(v).length > 0, {
  message: "Provide at least one field to update",
});

export const classListQuerySchema = z.object({
  ...pagination,
  academicYear: z.string().trim().max(20).optional(),
  departmentId: uuid.optional(),
  isActive: z.enum(["true", "false", "all"]).default("all"),
}).strict();

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30).transform(v => v.toUpperCase()),
}).strict();

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().min(2).max(30).transform(v => v.toUpperCase()).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(v => Object.keys(v).length > 0, {
  message: "Provide at least one field to update",
});

export const subjectListQuerySchema = z.object({
  ...pagination,
  isActive: z.enum(["true", "false", "all"]).default("all"),
}).strict();

export const createAssignmentSchema = z.object({
  classId: uuid,
  subjectId: uuid,
  teacherId: uuid,
}).strict();

export const reassignTeacherSchema = z.object({
  teacherId: uuid,
}).strict();

export const assignmentListQuerySchema = z.object({
  ...pagination,
  classId: uuid.optional(),
  subjectId: uuid.optional(),
  teacherId: uuid.optional(),
}).strict();
