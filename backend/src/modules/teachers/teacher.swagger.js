const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const protectedOperation = (summary, options = {}) => ({
  tags: ["Teacher"],
  summary,
  security: [{ bearerAuth: [] }],
  ...options,
  responses: {
    200: {
      description: "Successful response",
      content: { "application/json": { schema: ref("ApiResponse") } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ref("ApiError") } },
    },
    401: {
      description: "Missing or invalid JWT",
      content: { "application/json": { schema: ref("ApiError") } },
    },
    403: {
      description: "Teacher role required or account is restricted",
      content: { "application/json": { schema: ref("ApiError") } },
    },
    404: {
      description: "Resource not found",
      content: { "application/json": { schema: ref("ApiError") } },
    },
  },
});

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

// ==========================================
// MODULE 5: TEACHER TIMETABLE
// ==========================================

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

// ==========================================
// MODULE 6: STUDY MATERIALS
// ==========================================

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
    },
  },
};

export default teacherOpenApi;
