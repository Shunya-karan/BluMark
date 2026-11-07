const ref = (name) => ({ $ref: `#/components/schemas/${name}` });


const protectedOperation = (summary, options = {}) => {
  const { responses: customResponses = {}, ...operationOptions } = options;

  return {
    tags: ["Teacher"],
    summary,
    security: [{ bearerAuth: [] }],
    ...operationOptions,
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": { schema: ref("ApiResponse") },
        },
      },
      201: {
        description: "Resource created successfully",
        content: {
          "application/json": { schema: ref("ApiResponse") },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": { schema: ref("ApiError") },
        },
      },
      401: {
        description: "Missing or invalid JWT",
        content: {
          "application/json": { schema: ref("ApiError") },
        },
      },
      403: {
        description: "Teacher role required or account is restricted",
        content: {
          "application/json": { schema: ref("ApiError") },
        },
      },
      404: {
        description: "Resource not found",
        content: {
          "application/json": { schema: ref("ApiError") },
        },
      },
      ...customResponses,
    },
  };
};

export const teacherOpenApi = {
  tags: [
    {
      name: "Teacher",
      description: "Teacher dashboard, profile, timetable and assigned academic information",
    },
  ],
  paths: {
    "/api/v1/teacher/dashboard": {
      get: protectedOperation("Get the authenticated teacher's dashboard"),
    },
    "/api/v1/teacher/dashboard/summary": {
      get: protectedOperation("Get assigned class, subject, student and attendance totals"),
    },
    "/api/v1/teacher/dashboard/today-schedule": {
      get: protectedOperation("Get the authenticated teacher's schedule for today"),
    },
    "/api/v1/teacher/dashboard/attendance-summary": {
      get: protectedOperation("Get attendance record totals for sessions conducted by the teacher"),
    },
    "/api/v1/teacher/dashboard/recent-activity": {
      get: protectedOperation("Get recent audit activity performed by the teacher"),
    },
    "/api/v1/teacher/profile": {
      get: protectedOperation("Get the authenticated teacher's profile"),
      patch: protectedOperation("Update editable teacher profile fields", {
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: ref("TeacherProfileUpdate") },
          },
        },
      }),
    },
    "/api/v1/teacher/profile/department": {
      get: protectedOperation("Get the teacher's department"),
    },
    "/api/v1/teacher/profile/subjects": {
      get: protectedOperation("Get the teacher's assigned subjects and classes"),
    },
    "/api/v1/teacher/classes": {
      get: protectedOperation(
        "Get all classes assigned to the authenticated teacher",
      ),
    },
    "/api/v1/teacher/classes/{classId}": {
      get: protectedOperation(
        "Get details of a specific class assigned to the authenticated teacher",
        {
          parameters: [
            {
              in: "path",
              name: "classId",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
              description: "ID of the assigned class",
            },
          ],
        },
      ),
    },
    "/api/v1/teacher/classes/{classId}/students": {
      get: protectedOperation("Get enrolled students in an assigned class", {
        parameters: [
          {
            in: "path",
            name: "classId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
      }),
    },
    "/api/v1/teacher/classes/{classId}/students/{studentId}": {
      get: protectedOperation("Get a student's details within an assigned class", {
        parameters: [
          {
            in: "path",
            name: "classId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            in: "path",
            name: "studentId",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
      }),
    },

    // MODULE 1: CLASS SUBJECTS

    "/api/v1/teacher/classes/{classId}/subjects": {
      get: protectedOperation(
        "Get subjects assigned to the teacher in a specific class",
        {
          parameters: [
            {
              in: "path",
              name: "classId",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
          ],
        },
      ),
    },
    "/api/v1/teacher/classes/{classId}/subjects/{subjectId}": {
      get: protectedOperation(
        "Get details of a specific subject assigned to the teacher",
        {
          parameters: [
            {
              in: "path",
              name: "classId",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
            {
              in: "path",
              name: "subjectId",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
          ],
        },
      ),
    },
    // MODULE 2: CLASS STATISTICS

    "/api/v1/teacher/classes/{classId}/statistics": {
      get: protectedOperation(
        "Get student, subject and attendance statistics for an assigned class",
        {
          parameters: [
            {
              in: "path",
              name: "classId",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
          ],
        },
      ),
    },
    // MODULE 3: STUDENT DIRECTORY
    "/api/v1/teacher/classes/{classId}/students/directory": {
      get: protectedOperation(
        "Get a paginated and searchable student directory",
        {
          parameters: [
            {
              in: "path",
              name: "classId",
              required: true,
              schema: {
                type: "string",
                format: "uuid",
              },
            },
            {
              in: "query",
              name: "page",
              schema: {
                type: "integer",
                minimum: 1,
                default: 1,
              },
            },
            {
              in: "query",
              name: "limit",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 50,
                default: 10,
              },
            },
            {
              in: "query",
              name: "search",
              schema: {
                type: "string",
                maxLength: 100,
              },
              description: "Search by student name, email or student number",
            },
            {
              in: "query",
              name: "enrollmentStatus",
              schema: {
                type: "string",
                enum: ["active", "inactive", "all"],
                default: "active",
              },
            },
            {
              in: "query",
              name: "sortBy",
              schema: {
                type: "string",
                enum: ["fullName", "enrolledAt"],
                default: "fullName",
              },
            },
            {
              in: "query",
              name: "sortOrder",
              schema: {
                type: "string",
                enum: ["asc", "desc"],
                default: "asc",
              },
            },
          ],
        },
      ),
    },

    // ==========================================
    // MODULE 4: ATTENDANCE HISTORY
    // ==========================================

    "/api/v1/teacher/attendance/history": {
      get: protectedOperation(
        "Get paginated attendance history for the authenticated teacher",
        {
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            },
            {
              in: "query",
              name: "classId",
              schema: { type: "string", format: "uuid" },
              description: "Filter attendance sessions by assigned class",
            },
          ],
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}": {
      get: protectedOperation(
        "Get details of a specific attendance session",
        {
          parameters: [
            {
              in: "path",
              name: "sessionId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/records": {
      get: protectedOperation(
        "Get paginated student attendance records for a session",
        {
          parameters: [
            {
              in: "path",
              name: "sessionId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            },
            {
              in: "query",
              name: "status",
              schema: {
                type: "string",
                enum: ["PRESENT", "LATE", "ABSENT", "EXCUSED"],
              },
            },
          ],
        },
      ),
    },


    // MODULE 5: TEACHER TIMETABLE

    "/api/v1/teacher/timetable": {
      get: protectedOperation(
        "Get the authenticated teacher's complete weekly timetable",
      ),
    },

    "/api/v1/teacher/timetable/day/{weekday}": {
      get: protectedOperation(
        "Get the teacher's timetable for a specific weekday",
        {
          parameters: [
            {
              in: "path",
              name: "weekday",
              required: true,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 7,
              },
              description: "Monday = 1, Sunday = 7",
            },
          ],
        },
      ),
    },

    // MODULE 6: STUDY MATERIALS

    "/api/v1/teacher/study-materials": {
      get: protectedOperation(
        "Get paginated study materials uploaded by the teacher",
        {
          parameters: [
            {
              in: "query",
              name: "page",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
            },
            {
              in: "query",
              name: "search",
              schema: { type: "string", maxLength: 100 },
              description: "Search materials by title or description",
            },
            {
              in: "query",
              name: "classId",
              schema: { type: "string", format: "uuid" },
              description: "Filter materials by assigned class",
            },
          ],
        },
      ),
    },

    "/api/v1/teacher/study-materials/{materialId}": {
      get: protectedOperation(
        "Get details of a specific study material uploaded by the teacher",
        {
          parameters: [
            {
              in: "path",
              name: "materialId",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions": {
      post: protectedOperation(
        "Start a new attendance session for an assigned subject",
        {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("CreateAttendanceSession"),
              },
            },
          },
          responses: {
            409: {
              description: "Another attendance session is already active. Stop it before starting a new session.",
              content: {
                "application/json": {
                  schema: ref("ApiError"),
                },
              },
            },
          },
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/end": {
      patch: protectedOperation(
        "End an active attendance session",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            409: {
              description: "Session is already ended or expired",
              content: {
                "application/json": {
                  schema: ref("ApiError"),
                },
              },
            },
          },
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/live": {
      get: protectedOperation(
        "Get live attendance session details and attendance summary",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            404: {
              description: "Attendance session not found",
              content: {
                "application/json": {
                  schema: ref("ApiError"),
                },
              },
            },
          },
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/records/manual": {
      post: protectedOperation(
        "Manually mark attendance for a student",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("ManualAttendance"),
              },
            },
          },
          responses: {
            201: {
              description: "Student attendance marked successfully",
            },
            409: {
              description: "Session is inactive, expired, or attendance is already marked",
              content: {
                "application/json": {
                  schema: ref("ApiError"),
                },
              },
            },
          },
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/records/{recordId}": {
      patch: protectedOperation(
        "Correct an existing student attendance record",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "recordId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("CorrectAttendance"),
              },
            },
          },
          responses: {
            404: {
              description: "Attendance session or record not found",
              content: {
                "application/json": {
                  schema: ref("ApiError"),
                },
              },
            },
          },
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/records/bulk": {
      post: protectedOperation(
        "Mark attendance for multiple students",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("BulkManualAttendance"),
                example: {
                  records: [
                    {
                      studentId: "STUDENT_UUID_1",
                      status: "PRESENT",
                    },
                    {
                      studentId: "STUDENT_UUID_2",
                      status: "ABSENT",
                    },
                    {
                      studentId: "STUDENT_UUID_3",
                      status: "LATE",
                      notes: "Arrived 10 minutes late",
                    },
                    {
                      studentId: "STUDENT_UUID_4",
                      status: "EXCUSED",
                      notes: "Approved leave",
                    },
                  ],
                },
              },
            },
          },
          responses: {
            201: { description: "Bulk attendance marked successfully" },
            400: { description: "Invalid student enrollment" },
            409: { description: "Session inactive or attendance already exists" },
          },
        },
      ),

      patch: protectedOperation(
        "Update attendance for multiple students",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("BulkUpdateAttendance"),
              },
            },
          },
          responses: {
            200: { description: "Bulk attendance updated successfully" },
            404: { description: "Session or attendance records not found" },
          },
        },
      ),
    },

    "/api/v1/teacher/attendance/sessions/{sessionId}/attendance": {
      get: protectedOperation(
        "Get all enrolled students and their attendance statuses",
        {
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Full attendance roster fetched successfully" },
            404: { description: "Attendance session not found" },
          },
        },
      ),
    },
  },
  components: {
    schemas: {
      TeacherProfileUpdate: {
        type: "object",
        properties: {
          fullName: { type: "string", minLength: 1, maxLength: 120 },
          phone: { type: "string", nullable: true, minLength: 3, maxLength: 32 },
        },
        additionalProperties: false,
      },
      CreateAttendanceSession: {
        type: "object",
        required: ["classSubjectId"],
        properties: {
          classSubjectId: {
            type: "string",
            format: "uuid",
          },
          timetableSlotId: {
            type: "string",
            format: "uuid",
          },
          durationMinutes: {
            type: "integer",
            minimum: 1,
            maximum: 240,
            default: 60,
          },
        },
        additionalProperties: false,
      },
      ManualAttendance: {
        type: "object",
        required: ["studentId", "status"],
        properties: {
          studentId: {
            type: "string",
            format: "uuid",
          },
          status: {
            type: "string",
            enum: ["PRESENT", "LATE", "ABSENT", "EXCUSED"],
          },
          notes: {
            type: "string",
            nullable: true,
            maxLength: 500,
          },
        },
        additionalProperties: false,
      },
      CorrectAttendance: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["PRESENT", "LATE", "ABSENT", "EXCUSED"],
          },
          notes: {
            type: "string",
            nullable: true,
            maxLength: 500,
          },
        },
        additionalProperties: false,
      },
      BulkManualAttendance: {
        type: "object",
        required: ["records"],
        properties: {
          records: {
            type: "array",
            minItems: 1,
            maxItems: 500,
            items: {
              type: "object",
              required: ["studentId", "status"],
              properties: {
                studentId: {
                  type: "string",
                  format: "uuid",
                },
                status: {
                  type: "string",
                  enum: ["PRESENT", "LATE", "ABSENT", "EXCUSED"],
                },
                notes: {
                  type: "string",
                  nullable: true,
                  maxLength: 500,
                },
              },
            },
          },
        },
      },
    },
  },
};

export default teacherOpenApi;
