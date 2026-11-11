
import { z } from "zod";

const uuid = z.string().uuid("Invalid ID");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
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
