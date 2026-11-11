
const ref = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const operation = (summary, options = {}) => ({
  tags: ["Admin User Management"],
  summary,
  security: [{ bearerAuth: [] }],
  ...options,
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: ref("ApiResponse"),
        },
      },
    },
    400: { description: "Invalid request" },
    401: { description: "Authentication required" },
    403: { description: "Institution administrator required" },
    404: { description: "User or class not found" },
    409: { description: "Conflicting resource" },
  },
});

const pathId = {
  in: "path",
  name: "profileId",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const body = (schema) => ({
  required: true,
  content: {
    "application/json": {
      schema: ref(schema),
    },
  },
});

const listParameters = [
  { in: "query", name: "page", schema: { type: "integer", default: 1 } },
  { in: "query", name: "limit", schema: { type: "integer", default: 10, maximum: 50 } },
  { in: "query", name: "search", schema: { type: "string" } },
  { in: "query", name: "sortOrder", schema: { type: "string", enum: ["asc", "desc"] } },
  { in: "query", name: "isActive", schema: { type: "string", enum: ["true", "false", "all"] } },
];

const listOperation = (summary, extra = []) =>
  operation(summary, {
    parameters: [...listParameters, ...extra],
  });

export const userOpenApi = {
  tags: [
    {
      name: "Admin User Management",
      description: "Manage institution students, teachers, account status and student enrollments",
    },
  ],

  paths: {
    "/api/v1/admin/students": {
      get: listOperation("List and search institution students", [
        {
          in: "query",
          name: "classId",
          schema: { type: "string", format: "uuid" },
        },
      ]),
    },

    "/api/v1/admin/students/{profileId}": {
      get: operation("Get student details and enrollment history", {
        parameters: [pathId],
      }),
    },

    "/api/v1/admin/students/{profileId}/enrollment": {
      get: operation("Get the student's active class enrollment", {
        parameters: [pathId],
      }),
      put: operation("Assign or transfer a student to a class", {
        parameters: [pathId],
        requestBody: body("AssignStudentEnrollment"),
      }),
    },

    "/api/v1/admin/teachers": {
      get: listOperation("List and search institution teachers", [
        {
          in: "query",
          name: "departmentId",
          schema: { type: "string", format: "uuid" },
        },
      ]),
    },

    "/api/v1/admin/teachers/{profileId}": {
      get: operation("Get teacher details and assignments", {
        parameters: [pathId],
      }),
    },

    "/api/v1/admin/{profileId}/status": {
      patch: operation("Activate or deactivate a student or teacher account", {
        parameters: [pathId],
        requestBody: body("UpdateUserStatus"),
      }),
    },
  },

  components: {
    schemas: {
      AssignStudentEnrollment: {
        type: "object",
        required: ["classId"],
        properties: {
          classId: {
            type: "string",
            format: "uuid",
          },
        },
        additionalProperties: false,
      },

      UpdateUserStatus: {
        type: "object",
        required: ["isActive"],
        properties: {
          isActive: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    },
  },
};

export default userOpenApi;
