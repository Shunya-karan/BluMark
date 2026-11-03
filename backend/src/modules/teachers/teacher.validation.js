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


// ==========================================
// TEACHER SUBJECT VALIDATION
// ==========================================

export const classSubjectParamSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
});

// ==========================================
// TEACHER STUDENT DIRECTORY QUERY VALIDATION
// ==========================================

export const studentDirectoryQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Maximum limit is 50")
    .default(10),

  search: z.string().trim().max(100, "Search cannot exceed 100 characters").default(""),

  enrollmentStatus: z
    .enum(["active", "inactive", "all"])
    .default("active"),

  sortBy: z
    .enum(["fullName", "enrolledAt"])
    .default("fullName"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("asc"),
});


// ==========================================
// MODULE 4: ATTENDANCE HISTORY VALIDATION
// ==========================================

export const attendanceHistoryQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

  classId: z.string().uuid("Invalid class ID").optional(),
});

export const attendanceSessionParamSchema = z.object({
  sessionId: z.string().uuid("Invalid attendance session ID"),
});

export const sessionAttendanceQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

  status: z
    .enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"])
    .optional(),
});

// ==========================================
// MODULE 5: TIMETABLE VALIDATION
// ==========================================

export const timetableWeekdaySchema = z.object({
  weekday: z.coerce
    .number()
    .int()
    .min(1, "Weekday must be between 1 and 7")
    .max(7, "Weekday must be between 1 and 7"),
});

// ==========================================
// MODULE 6: STUDY MATERIAL VALIDATION
// ==========================================

export const studyMaterialParamSchema = z.object({
  materialId: z.string().uuid("Invalid study material ID"),
});

export const studyMaterialQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

  search: z.string()
    .trim()
    .max(100, "Search cannot exceed 100 characters")
    .default(""),

  classId: z.string().uuid("Invalid class ID").optional(),
});
