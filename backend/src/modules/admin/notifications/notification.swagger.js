
const ref = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const operation = (summary, options = {}) => ({
  tags: ["Admin Notification Management"],
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
    201: {
      description: "Notification sent successfully",
      content: {
        "application/json": {
          schema: ref("ApiResponse"),
        },
      },
    },
    400: { description: "Invalid request" },
    401: { description: "Authentication required" },
    403: { description: "Institution administrator required" },
    404: { description: "Recipient or notification not found" },
    413: { description: "Recipient limit exceeded" },
  },
});

const notificationId = {
  in: "path",
  name: "notificationId",
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

const pagination = [
  { in: "query", name: "page", schema: { type: "integer", default: 1 } },
  { in: "query", name: "limit", schema: { type: "integer", default: 10, maximum: 50 } },
];

export const notificationOpenApi = {
  tags: [
    {
      name: "Admin Notification Management",
      description: "Send and review institution notifications",
    },
  ],

  paths: {
    "/api/v1/admin/notifications": {
      post: operation("Send a notification to selected recipients", {
        requestBody: body("CreateNotification"),
      }),
      get: operation("List notification delivery records", {
        parameters: [
          ...pagination,
          {
            in: "query",
            name: "search",
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "type",
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "recipientRole",
            schema: {
              type: "string",
              enum: ["STUDENT", "TEACHER"],
            },
          },
          {
            in: "query",
            name: "readStatus",
            schema: {
              type: "string",
              enum: ["READ", "UNREAD", "ALL"],
              default: "ALL",
            },
          },
          {
            in: "query",
            name: "sortOrder",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
            },
          },
        ],
      }),
    },

    "/api/v1/admin/notifications/stats": {
      get: operation("Get notification delivery statistics"),
    },

    "/api/v1/admin/notifications/{notificationId}": {
      get: operation("Get an individual notification delivery record", {
        parameters: [notificationId],
      }),
    },
  },

  components: {
    schemas: {
      CreateNotification: {
        type: "object",
        required: ["title", "body", "target"],
        properties: {
          title: {
            type: "string",
            minLength: 3,
            maxLength: 150,
          },
          body: {
            type: "string",
            minLength: 1,
            maxLength: 5000,
          },
          type: {
            type: "string",
            minLength: 2,
            maxLength: 64,
            default: "GENERAL",
          },
          target: {
            oneOf: [
              {
                type: "object",
                required: ["scope"],
                properties: {
                  scope: { type: "string", enum: ["INSTITUTION"] },
                },
                additionalProperties: false,
              },
              {
                type: "object",
                required: ["scope", "role"],
                properties: {
                  scope: { type: "string", enum: ["ROLE"] },
                  role: { type: "string", enum: ["STUDENT", "TEACHER"] },
                },
                additionalProperties: false,
              },
              {
                type: "object",
                required: ["scope", "classId"],
                properties: {
                  scope: { type: "string", enum: ["CLASS"] },
                  classId: { type: "string", format: "uuid" },
                },
                additionalProperties: false,
              },
              {
                type: "object",
                required: ["scope", "userIds"],
                properties: {
                  scope: { type: "string", enum: ["USERS"] },
                  userIds: {
                    type: "array",
                    minItems: 1,
                    maxItems: 500,
                    items: { type: "string", format: "uuid" },
                  },
                },
                additionalProperties: false,
              },
            ],
          },
        },
        additionalProperties: false,
      },
    },
  },
};

export default notificationOpenApi;
