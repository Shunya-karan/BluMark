import { z } from "zod";

const uuid = z.uuid();
const date = z.coerce.date();
const positiveInt = z.coerce.number().int().min(1);

export const paginationSchema = z.object({
  page: positiveInt.default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(3).max(32).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one editable profile field.",
});

export const attendanceHistorySchema = paginationSchema.extend({
  from: date.optional(),
  to: date.optional(),
  subjectId: uuid.optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "from must be before to.",
  path: ["to"],
});

export const attendanceCalendarSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
}).strict();

export const subjectParamSchema = z.object({ subjectId: uuid }).strict();
export const materialParamSchema = z.object({ materialId: uuid }).strict();
export const notificationParamSchema = z.object({ notificationId: uuid }).strict();

export const studyMaterialsSchema = paginationSchema.extend({
  subjectId: uuid.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  from: date.optional(),
  to: date.optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: "from must be before to.",
  path: ["to"],
});

export const notificationsSchema = paginationSchema.extend({
  unread: z.enum(["true", "false"]).optional(),
}).strict();

export const registerDeviceSchema = z.object({
  deviceIdentifier: z.string().trim().min(8).max(255),
  publicKey: z.string().trim().min(32).max(8192).optional(),
}).strict();

export const replacementRequestSchema = z.object({
  deviceIdentifier: z.string().trim().min(8).max(255),
  publicKey: z.string().trim().min(32).max(8192).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
}).strict();
