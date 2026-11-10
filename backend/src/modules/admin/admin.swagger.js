
const ref = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const protectedOperation = (summary, options = {}) => ({
  tags: ["Admin"],
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
    400: {
      description: "Invalid request",
      content: {
        "application/json": {
          schema: ref("ApiError"),
        },
      },
    },
    401: {
      description: "Authentication required",
    },
    403: {
      description: "Administrator access required",
    },
    404: {
      description: "Resource not found",
    },
    ...(options.responses || {}),
  },
});

const adminOpenApi = {
  tags: [
    {
      name: "Admin",
      description: "Institution administrator operations",
    },
  ],

  paths: {
    "/api/v1/admin/dashboard": {
      get: protectedOperation(
        "Get the complete institution administrator dashboard",
      ),
    },

    "/api/v1/admin/dashboard/summary": {
      get: protectedOperation(
        "Get institution-wide dashboard statistics",
      ),
    },

    "/api/v1/admin/dashboard/recent-activity": {
      get: protectedOperation(
        "Get recent institution audit activity",
        {
          parameters: [
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
          ],
        },
      ),
    },

    "/api/v1/admin/profile": {
      get: protectedOperation(
        "Get the authenticated administrator profile",
      ),

      patch: protectedOperation(
        "Update the authenticated administrator profile",
        {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("UpdateAdminProfile"),
                example: {
                  fullName: "Institution Administrator",
                  phone: "+919876543210",
                },
              },
            },
          },
        },
      ),
    },
  },

  components: {
    schemas: {
      UpdateAdminProfile: {
        type: "object",
        properties: {
          fullName: {
            type: "string",
            minLength: 2,
            maxLength: 120,
          },
          phone: {
            type: "string",
            minLength: 3,
            maxLength: 32,
            nullable: true,
          },
        },
        additionalProperties: false,
      },
    },
  },
};

export default adminOpenApi;
