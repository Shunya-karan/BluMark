
const ref = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const operation = (summary, options = {}) => ({
  tags: ["Admin Academic Management"],
  summary,
  security: [{ bearerAuth: [] }],
  ...options,
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
    400: { description: "Invalid request" },
    401: { description: "Authentication required" },
    403: { description: "Institution administrator required" },
    404: { description: "Resource not found" },
    409: { description: "Duplicate or conflicting resource" },
  },
});

const pathId = (name) => ({
  in: "path",
  name,
  required: true,
  schema: { type: "string", format: "uuid" },
});

const body = (schema) => ({
  required: true,
  content: {
    "application/json": { schema: ref(schema) },
  },
});

const listParameters = [
  { in: "query", name: "page", schema: { type: "integer", default: 1 } },
  { in: "query", name: "limit", schema: { type: "integer", default: 10, maximum: 50 } },
  { in: "query", name: "search", schema: { type: "string" } },
  { in: "query", name: "sortOrder", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
];

const listOperation = (summary, extra = []) =>
  operation(summary, { parameters: [...listParameters, ...extra] });

export const academicOpenApi = {
  tags: [
    {
      name: "Admin Academic Management",
      description: "Institution departments, classes, subjects and teacher assignments",
    },
  ],

  paths: {
    // DEPARTMENTS

    "/api/v1/admin/departments": {
      post: operation("Create a department", {
        requestBody: body("CreateDepartment"),
      }),
      get: listOperation("List institution departments", [
        { in: "query", name: "isActive", schema: { type: "string", enum: ["true", "false", "all"] } },
      ]),
    },

    "/api/v1/admin/departments/{departmentId}": {
      get: operation("Get department details", {
        parameters: [pathId("departmentId")],
      }),
      patch: operation("Update or deactivate a department", {
        parameters: [pathId("departmentId")],
        requestBody: body("UpdateDepartment"),
      }),
    },

    // CLASSES

    "/api/v1/admin/classes": {
      post: operation("Create a class or batch", {
        requestBody: body("CreateClass"),
      }),
      get: listOperation("List institution classes", [
        { in: "query", name: "academicYear", schema: { type: "string" } },
        { in: "query", name: "departmentId", schema: { type: "string", format: "uuid" } },
        { in: "query", name: "isActive", schema: { type: "string", enum: ["true", "false", "all"] } },
      ]),
    },

    "/api/v1/admin/classes/{classId}": {
      get: operation("Get class details, subjects and enrollment counts", {
        parameters: [pathId("classId")],
      }),
      patch: operation("Update or deactivate a class", {
        parameters: [pathId("classId")],
        requestBody: body("UpdateClass"),
      }),
    },

    // SUBJECTS

    "/api/v1/admin/subjects": {
      post: operation("Create a subject", {
        requestBody: body("CreateSubject"),
      }),
      get: listOperation("List institution subjects", [
        { in: "query", name: "isActive", schema: { type: "string", enum: ["true", "false", "all"] } },
      ]),
    },

    "/api/v1/admin/subjects/{subjectId}": {
      get: operation("Get subject details and class assignments", {
        parameters: [pathId("subjectId")],
      }),
      patch: operation("Update or deactivate a subject", {
        parameters: [pathId("subjectId")],
        requestBody: body("UpdateSubject"),
      }),
    },

    // TEACHER ASSIGNMENTS

    "/api/v1/admin/assignments": {
      post: operation("Assign a teacher to a class and subject", {
        requestBody: body("CreateTeacherAssignment"),
      }),
      get: listOperation("List teacher assignments", [
        { in: "query", name: "classId", schema: { type: "string", format: "uuid" } },
        { in: "query", name: "subjectId", schema: { type: "string", format: "uuid" } },
        { in: "query", name: "teacherId", schema: { type: "string", format: "uuid" } },
      ]),
    },

    "/api/v1/admin/assignments/{assignmentId}": {
      get: operation("Get teacher assignment details", {
        parameters: [pathId("assignmentId")],
      }),
    },

    "/api/v1/admin/assignments/{assignmentId}/teacher": {
      patch: operation("Reassign a class subject to another teacher", {
        parameters: [pathId("assignmentId")],
        requestBody: body("ReassignTeacher"),
      }),
    },
  },

  components: {
    schemas: {
      CreateDepartment: {
        type: "object",
        required: ["name", "code"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          code: { type: "string", minLength: 2, maxLength: 30 },
        },
        additionalProperties: false,
      },

      UpdateDepartment: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          code: { type: "string", minLength: 2, maxLength: 30 },
          isActive: { type: "boolean" },
        },
        additionalProperties: false,
      },

      CreateClass: {
        type: "object",
        required: ["name", "academicYear"],
        properties: {
          name: { type: "string" },
          division: { type: "string", nullable: true },
          academicYear: { type: "string" },
          semester: { type: "integer", nullable: true, minimum: 1, maximum: 20 },
          departmentId: { type: "string", format: "uuid", nullable: true },
        },
        additionalProperties: false,
      },

      UpdateClass: {
        type: "object",
        properties: {
          name: { type: "string" },
          division: { type: "string", nullable: true },
          academicYear: { type: "string" },
          semester: { type: "integer", nullable: true, minimum: 1, maximum: 20 },
          departmentId: { type: "string", format: "uuid", nullable: true },
          isActive: { type: "boolean" },
        },
        additionalProperties: false,
      },

      CreateSubject: {
        type: "object",
        required: ["name", "code"],
        properties: {
          name: { type: "string" },
          code: { type: "string" },
        },
        additionalProperties: false,
      },

      UpdateSubject: {
        type: "object",
        properties: {
          name: { type: "string" },
          code: { type: "string" },
          isActive: { type: "boolean" },
        },
        additionalProperties: false,
      },

      CreateTeacherAssignment: {
        type: "object",
        required: ["classId", "subjectId", "teacherId"],
        properties: {
          classId: { type: "string", format: "uuid" },
          subjectId: { type: "string", format: "uuid" },
          teacherId: { type: "string", format: "uuid" },
        },
        additionalProperties: false,
      },

      ReassignTeacher: {
        type: "object",
        required: ["teacherId"],
        properties: {
          teacherId: { type: "string", format: "uuid" },
        },
        additionalProperties: false,
      },
    },
  },
};

export default academicOpenApi;
