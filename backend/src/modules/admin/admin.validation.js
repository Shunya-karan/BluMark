
import { z } from "zod";

export const updateAdminProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(3).max(32).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" },
);

export const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
}).strict();

export const attendanceSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(""),
  status: z.enum(["ACTIVE", "ENDED", "EXPIRED", "ALL"]).default("ALL"),
  classId: z.string().uuid().optional(),
  date: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

