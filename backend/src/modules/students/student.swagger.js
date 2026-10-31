const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const protectedOperation = (summary, options = {}) => ({
  tags: ["Student"],
  summary,
  security: [{ bearerAuth: [] }],
  ...options,
  responses: {
    200: { description: "Successful response", content: { "application/json": { schema: ref("ApiResponse") } } },
    400: { description: "Invalid request", content: { "application/json": { schema: ref("ApiError") } } },
    401: { description: "Missing or invalid JWT", content: { "application/json": { schema: ref("ApiError") } } },
    403: { description: "Student role required", content: { "application/json": { schema: ref("ApiError") } } },
    404: { description: "Resource not found", content: { "application/json": { schema: ref("ApiError") } } },
  },
});
const query = (name, schema, description) => ({ name, in: "query", required: false, description, schema });
const idParam = (name) => ({ name, in: "path", required: true, schema: { type: "string", format: "uuid" } });

export const studentOpenApi = {
  tags: [{ name: "Student", description: "Student-owned dashboard, academic, attendance, and device APIs" }],
  paths: {
    "/api/v1/student/dashboard": { get: protectedOperation("Get the authenticated student's dashboard") },
    "/api/v1/student/profile": {
      get: protectedOperation("Get the authenticated student's profile"),
      patch: protectedOperation("Update permitted profile fields", {
        requestBody: { required: true, content: { "application/json": { schema: ref("StudentProfileUpdate") } } },
      }),
    },
    "/api/v1/student/attendance/summary": { get: protectedOperation("Get attendance totals and subject summaries") },
    "/api/v1/student/attendance/history": { get: protectedOperation("Get paginated attendance history", {
      parameters: [query("page", { type: "integer", minimum: 1 }), query("limit", { type: "integer", minimum: 1, maximum: 100 }), query("from", { type: "string", format: "date-time" }), query("to", { type: "string", format: "date-time" }), query("subjectId", { type: "string", format: "uuid" }), query("status", { type: "string", enum: ["PRESENT", "LATE", "ABSENT", "EXCUSED"] })],
    }) },
    "/api/v1/student/attendance/calendar": { get: protectedOperation("Get attendance records grouped by date", {
      parameters: [{ name: "year", in: "query", required: true, schema: { type: "integer" } }, { name: "month", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: 12 } }],
    }) },
    "/api/v1/student/attendance/subjects": { get: protectedOperation("Get subject-wise attendance") },
    "/api/v1/student/timetable": { get: protectedOperation("Get timetable for active enrolled classes") },
    "/api/v1/student/timetable/today": { get: protectedOperation("Get today's timetable") },
    "/api/v1/student/timetable/upcoming": { get: protectedOperation("Get upcoming timetable slots") },
    "/api/v1/student/subjects": { get: protectedOperation("Get subjects assigned to active enrolled classes") },
    "/api/v1/student/subjects/{subjectId}": { get: protectedOperation("Get an enrolled subject", { parameters: [idParam("subjectId")] }) },
    "/api/v1/student/study-materials": { get: protectedOperation("Get enrolled study materials", {
      parameters: [query("page", { type: "integer", minimum: 1 }), query("limit", { type: "integer", maximum: 100 }), query("subjectId", { type: "string", format: "uuid" }), query("search", { type: "string" }), query("from", { type: "string", format: "date-time" }), query("to", { type: "string", format: "date-time" })],
    }) },
    "/api/v1/student/study-materials/{materialId}": { get: protectedOperation("Get an enrolled study material", { parameters: [idParam("materialId")] }) },
    "/api/v1/student/notifications": { get: protectedOperation("Get the student's notifications", {
      parameters: [query("page", { type: "integer", minimum: 1 }), query("limit", { type: "integer", maximum: 100 }), query("unread", { type: "boolean" })],
    }) },
    "/api/v1/student/notifications/read-all": { patch: protectedOperation("Mark all own notifications as read") },
    "/api/v1/student/notifications/{notificationId}": { get: protectedOperation("Get an own notification", { parameters: [idParam("notificationId")] }) },
    "/api/v1/student/notifications/{notificationId}/read": { patch: protectedOperation("Mark an own notification as read", { parameters: [idParam("notificationId")] }) },
    "/api/v1/student/device": { get: protectedOperation("Get own device registration information") },
    "/api/v1/student/device/register": { post: protectedOperation("Request device registration", {
      requestBody: { required: true, content: { "application/json": { schema: ref("DeviceRegistrationRequest") } } },
    }) },
    "/api/v1/student/device/request-replacement": { delete: protectedOperation("Request admin approval for a replacement device", {
      requestBody: { required: true, content: { "application/json": { schema: ref("DeviceReplacementRequest") } } },
    }) },
    "/api/v1/student/academic-details": { get: protectedOperation("Get own academic details") },
    "/api/v1/student/enrollment": { get: protectedOperation("Get own active enrollments") },
  },
  components: {
    schemas: {
      StudentProfileUpdate: { type: "object", properties: { fullName: { type: "string", maxLength: 120 }, phone: { type: "string", nullable: true, maxLength: 32 } }, additionalProperties: false },
      DeviceRegistrationRequest: { type: "object", required: ["deviceIdentifier"], properties: { deviceIdentifier: { type: "string" }, publicKey: { type: "string", writeOnly: true } } },
      DeviceReplacementRequest: { type: "object", required: ["deviceIdentifier"], properties: { deviceIdentifier: { type: "string" }, publicKey: { type: "string", writeOnly: true }, reason: { type: "string", maxLength: 500 } } },
    },
  },
};

export default studentOpenApi;
