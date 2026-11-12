
const ref = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const operation = (summary, options = {}) => ({
  tags: ["Admin Device Management"],
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
    404: { description: "Device or request not found" },
    409: { description: "Device state conflict" },
  },
});

const deviceId = {
  in: "path",
  name: "deviceId",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const requestId = {
  in: "path",
  name: "requestId",
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
  { in: "query", name: "search", schema: { type: "string" } },
  { in: "query", name: "sortOrder", schema: { type: "string", enum: ["asc", "desc"] } },
  { in: "query", name: "profileId", schema: { type: "string", format: "uuid" } },
];

export const deviceOpenApi = {
  tags: [
    {
      name: "Admin Device Management",
      description: "Manage student device registrations and replacement approvals",
    },
  ],

  paths: {
    "/api/v1/admin/devices": {
      get: operation("List institution devices", {
        parameters: [
          ...pagination,
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["PENDING", "ACTIVE", "REJECTED", "REVOKED", "all"],
            },
          },
        ],
      }),
    },

    "/api/v1/admin/devices/{deviceId}": {
      get: operation("Get device details", {
        parameters: [deviceId],
      }),
    },

    "/api/v1/admin/devices/{deviceId}/approve": {
      patch: operation("Approve a pending device registration", {
        parameters: [deviceId],
      }),
    },

    "/api/v1/admin/devices/{deviceId}/reject": {
      patch: operation("Reject a pending device registration", {
        parameters: [deviceId],
        requestBody: body("DeviceDecisionReason"),
      }),
    },

    "/api/v1/admin/devices/{deviceId}/revoke": {
      patch: operation("Revoke an active student device", {
        parameters: [deviceId],
        requestBody: body("DeviceDecisionReason"),
      }),
    },

    "/api/v1/admin/device-replacement-requests": {
      get: operation("List device replacement requests", {
        parameters: [
          ...pagination,
          {
            in: "query",
            name: "status",
            schema: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "all"],
            },
          },
        ],
      }),
    },

    "/api/v1/admin/device-replacement-requests/{requestId}": {
      get: operation("Get device replacement request details", {
        parameters: [requestId],
      }),
    },

    "/api/v1/admin/device-replacement-requests/{requestId}/approve": {
      patch: operation("Approve a device replacement request", {
        parameters: [requestId],
      }),
    },

    "/api/v1/admin/device-replacement-requests/{requestId}/reject": {
      patch: operation("Reject a device replacement request", {
        parameters: [requestId],
        requestBody: body("DeviceDecisionReason"),
      }),
    },
  },

  components: {
    schemas: {
      DeviceDecisionReason: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: {
            type: "string",
            minLength: 3,
            maxLength: 500,
          },
        },
        additionalProperties: false,
      },
    },
  },
};

export default deviceOpenApi;