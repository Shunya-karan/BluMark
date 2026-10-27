import { z } from "zod";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(12).max(128);

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(40).max(100).optional(),
}).strict();

export const provisionUserSchema = z.discriminatedUnion("role", [
  z.object({
    fullName: z.string().trim().min(1).max(120),
    email,
    phone: z.string().trim().max(32).optional(),
    role: z.literal("TEACHER"),
    employeeId: z.string().trim().min(1).max(64),
    departmentId: z.uuid().optional(),
  }).strict(),
  z.object({
    fullName: z.string().trim().min(1).max(120),
    email,
    phone: z.string().trim().max(32).optional(),
    role: z.literal("STUDENT"),
    studentNumber: z.string().trim().min(1).max(64),
  }).strict(),
]);

export const provisionSchema = provisionUserSchema;
export const provisionBulkSchema = z.object({
  users: z.array(z.unknown()).min(1).max(100),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
}).strict();

export const forgotPasswordSchema = z.object({ email }).strict();
export const activationRequestSchema = z.object({ email }).strict();
export const activationCompleteSchema = z.object({
  token: z.string().min(40).max(100),
  password,
}).strict();
export const resetPasswordSchema = z.object({
  token: z.string().min(40).max(100),
  newPassword: password,
}).strict();

