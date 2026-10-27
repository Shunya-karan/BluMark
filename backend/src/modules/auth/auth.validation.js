import { z } from "zod";
const email = z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  newPassword = z.string().min(12).max(128);
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(256) })
  .strict();
export const refreshSchema = z
  .object({ refreshToken: z.string().min(1).max(4096) })
  .strict();
export const provisionSchema = z.discriminatedUnion("role", [
  z
    .object({
      fullName: z.string().trim().min(1).max(120),
      email,
      phone: z.string().trim().max(32).optional(),
      role: z.literal("TEACHER"),
      employeeId: z.string().trim().min(1).max(64),
      departmentId: z.uuid().optional(),
    })
    .strict(),
  z
    .object({
      fullName: z.string().trim().min(1).max(120),
      email,
      phone: z.string().trim().max(32).optional(),
      role: z.literal("STUDENT"),
      studentNumber: z.string().trim().min(1).max(64),
    })
    .strict(),
]);
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(256), newPassword })
  .strict();
export const forgotPasswordSchema = z.object({ email }).strict();
export const resetPasswordSchema = z
  .object({ tokenHash: z.string().min(1).max(4096), newPassword })
  .strict();
