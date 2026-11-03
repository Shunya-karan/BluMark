import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(3).max(32).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one editable profile field.",
});


// TEACHER CLASS VALIDATION

export const classParamSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
});

export const classStudentParamSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  studentId: z.string().uuid("Invalid student ID"),
});