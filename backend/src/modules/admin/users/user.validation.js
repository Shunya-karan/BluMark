
import { z } from "zod";

const uuid = z.string().uuid("Invalid ID");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(""),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
};

export const profileIdParamSchema = z.object({
  profileId: uuid,
}).strict();

export const studentListQuerySchema = z.object({
  ...pagination,
  isActive: z.enum(["true", "false", "all"]).default("all"),
  classId: uuid.optional(),
}).strict();

export const teacherListQuerySchema = z.object({
  ...pagination,
  isActive: z.enum(["true", "false", "all"]).default("all"),
  departmentId: uuid.optional(),
}).strict();

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const assignEnrollmentSchema = z.object({
  classId: uuid,
}).strict();

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  studentNumber: z.string().trim().min(1).max(64).optional(),
  classId: uuid.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update",
});

export const updateTeacherSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  employeeId: z.string().trim().min(1).max(64).optional(),
  departmentId: uuid.nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update",
});

