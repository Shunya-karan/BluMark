
import { z } from "zod";

const uuid = z.string().uuid("Invalid ID");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

const institutionTarget = z.object({
  scope: z.literal("INSTITUTION"),
}).strict();

const roleTarget = z.object({
  scope: z.literal("ROLE"),
  role: z.enum(["STUDENT", "TEACHER"]),
}).strict();

const classTarget = z.object({
  scope: z.literal("CLASS"),
  classId: uuid,
}).strict();

const usersTarget = z.object({
  scope: z.literal("USERS"),
  userIds: z.array(uuid).min(1).max(500),
}).strict().refine(
  (value) => new Set(value.userIds).size === value.userIds.length,
  { message: "Duplicate user IDs are not allowed", path: ["userIds"] },
);

export const createNotificationSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(1).max(5000),
  type: z.string().trim().min(2).max(64).default("GENERAL"),
  target: z.discriminatedUnion("scope", [
    institutionTarget,
    roleTarget,
    classTarget,
    usersTarget,
  ]),
}).strict();

export const notificationListQuerySchema = z.object({
  ...pagination,
  search: z.string().trim().max(120).optional(),
  type: z.string().trim().min(2).max(64).optional(),
  recipientRole: z.enum(["STUDENT", "TEACHER"]).optional(),
  readStatus: z.enum(["READ", "UNREAD", "ALL"]).default("ALL"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const notificationIdParamSchema = z.object({
  notificationId: uuid,
}).strict();
