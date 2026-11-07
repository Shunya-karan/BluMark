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


// TEACHER SUBJECT VALIDATION

export const classSubjectParamSchema = z.object({
  classId: z.string().uuid("Invalid class ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
});

// TEACHER STUDENT DIRECTORY QUERY VALIDATION


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


// ATTENDANCE HISTORY VALIDATION

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

//  TIMETABLE VALIDATION

export const timetableWeekdaySchema = z.object({
  weekday: z.coerce
    .number()
    .int()
    .min(1, "Weekday must be between 1 and 7")
    .max(7, "Weekday must be between 1 and 7"),
});

// STUDY MATERIAL VALIDATION

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

export const createAttendanceSessionSchema = z.object({
  classSubjectId: z
    .string()
    .uuid("Invalid class subject ID"),

  timetableSlotId: z
    .string()
    .uuid("Invalid timetable slot ID")
    .optional(),

  durationMinutes: z.coerce
    .number()
    .int("Duration must be a whole number")
    .min(1, "Session duration must be at least 1 minute")
    .max(240, "Session duration cannot exceed 240 minutes")
    .default(60),
});

export const sessionIdParamSchema = z.object({
  sessionId: z
    .string()
    .uuid("Invalid attendance session ID"),
});

// ATTENDANCE OPERATIONS VALIDATION

const attendanceStatusSchema = z.enum([
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
]);

export const attendanceRecordParamSchema = z.object({
  sessionId: z.string().uuid("Invalid attendance session ID"),
  recordId: z.string().uuid("Invalid attendance record ID"),
});

export const manualAttendanceSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  status: attendanceStatusSchema,
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").nullable().optional(),
});

export const correctAttendanceSchema = z.object({
  status: attendanceStatusSchema,
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").nullable().optional(),
});

// BULK ATTENDANCE VALIDATION

const bulkAttendanceStatusSchema = z.enum([
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
]);

export const bulkManualAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().uuid("Invalid student ID"),
        status: bulkAttendanceStatusSchema,
        notes: z.string().trim().max(500).nullable().optional(),
      }),
    )
    .min(1, "At least one student is required")
    .max(500, "Maximum 500 students can be processed at once")
    .superRefine((records, ctx) => {
      const ids = records.map((record) => record.studentId);

      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate student IDs are not allowed",
        });
      }
    }),
});

export const bulkUpdateAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        recordId: z.string().uuid("Invalid attendance record ID"),
        status: bulkAttendanceStatusSchema,
        notes: z.string().trim().max(500).nullable().optional(),
      }),
    )
    .min(1, "At least one attendance record is required")
    .max(500, "Maximum 500 records can be updated at once")
    .superRefine((records, ctx) => {
      const ids = records.map((record) => record.recordId);

      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: "custom",
          message: "Duplicate attendance record IDs are not allowed",
        });
      }
    }),
});

// ======================================================
// STUDY MATERIAL MANAGEMENT VALIDATION
// ======================================================

export const createStudyMaterialSchema = z.object({
  classSubjectId: z.string().uuid("Invalid class subject ID"),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const updateStudyMaterialSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const studyMaterialManagementParamSchema = z.object({
  materialId: z.string().uuid("Invalid study material ID"),
});