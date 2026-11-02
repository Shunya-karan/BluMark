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
