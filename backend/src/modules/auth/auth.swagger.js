
const ref = (name) => ({
  $ref: `#/components/schemas/${name}`,
});

const jsonBody = (schema) => ({
  required: true,
  content: {
    "application/json": {
      schema: ref(schema),
    },
  },
});

const jsonResponse = (description, schema = "ApiResponse") => ({
  description,
  content: {
    "application/json": {
      schema: ref(schema),
    },
  },
});

const errors = {
  400: jsonResponse("Bad request", "ApiError"),
  401: jsonResponse("Unauthorized", "ApiError"),
  403: jsonResponse("Forbidden", "ApiError"),
  500: jsonResponse("Internal server error", "ApiError"),
};

const protectedErrors = {
  ...errors,
  401: jsonResponse("Missing or invalid access token", "ApiError"),
};

export const authOpenApi = {
  openapi: "3.0.3",

  info: {
    title: "Blu-Mark Authentication API",
    version: "1.0.0",
    description:
      "Authentication APIs for Blu-Mark using Supabase Auth.",
  },

  servers: [
    {
      url: "/",
      description: "Current server",
    },
  ],

  tags: [
    {
      name: "Authentication",
      description: "Login, sessions, and password management",
    },
  ],

  paths: {
    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login",
        description: "Authenticate using email and password.",

        requestBody: jsonBody("LoginRequest"),

        responses: {
          200: jsonResponse("Login successful", "AuthSession"),
          401: jsonResponse("Invalid credentials", "ApiError"),
          403: jsonResponse("Account is inactive", "ApiError"),
          429: jsonResponse("Too many requests", "ApiError"),
        },
      },
    },

    "/api/v1/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user",
        security: [{ bearerAuth: [] }],

        responses: {
          200: jsonResponse("User profile", "UserProfile"),
          ...protectedErrors,
        },
      },
    },

    "/api/v1/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh session",

        requestBody: jsonBody("RefreshRequest"),

        responses: {
          200: jsonResponse("Session refreshed", "AuthSession"),
          401: jsonResponse("Invalid refresh token", "ApiError"),
          400: jsonResponse("Invalid request", "ApiError"),
        },
      },
    },

    "/api/v1/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout",
        security: [{ bearerAuth: [] }],

        responses: {
          200: jsonResponse("Logout successful", "ApiResponse"),
          ...protectedErrors,
        },
      },
    },

    "/api/v1/auth/change-password": {
      post: {
        tags: ["Authentication"],
        summary: "Change password",
        security: [{ bearerAuth: [] }],

        requestBody: jsonBody("ChangePasswordRequest"),

        responses: {
          200: jsonResponse("Password changed", "ApiResponse"),
          ...protectedErrors,
        },
      },
    },

    "/api/v1/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Request password reset",

        requestBody: jsonBody("ForgotPasswordRequest"),

        responses: {
          200: jsonResponse("Reset request accepted", "ApiResponse"),
          400: jsonResponse("Invalid request", "ApiError"),
        },
      },
    },

    "/api/v1/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password",

        requestBody: jsonBody("ResetPasswordRequest"),

        responses: {
          200: jsonResponse("Password reset successful", "ApiResponse"),
          400: jsonResponse("Invalid or expired recovery token", "ApiError"),
        },
      },
    },

    "/api/v1/auth/provision-user": {
      post: {
        tags: ["Authentication"],
        summary: "Create teacher or student account",
        description: "Requires institution administrator authorization.",
        security: [{ bearerAuth: [] }],

        requestBody: jsonBody("ProvisionUserRequest"),

        responses: {
          201: jsonResponse("Account created", "ApiResponse"),
          ...protectedErrors,
          409: jsonResponse("Email or identifier already exists", "ApiError"),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },

    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Invalid credentials" },
        },
      },

      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            additionalProperties: true,
          },
        },
      },

      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "student1@bm.example.com",
          },
          password: {
            type: "string",
            format: "password",
            writeOnly: true,
          },
        },
      },

      AuthSession: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string", writeOnly: true },
              tokenType: { type: "string", example: "bearer" },
              expiresIn: { type: "integer" },
              profile: ref("UserProfile"),
            },
          },
        },
      },

      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          role: {
            type: "string",
            enum: ["INSTITUTION_ADMIN", "TEACHER", "STUDENT"],
          },
          institutionId: { type: "string", format: "uuid" },
          isActive: { type: "boolean" },
        },
      },

      RefreshRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string", writeOnly: true },
        },
      },

      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", writeOnly: true },
          newPassword: {
            type: "string",
            minLength: 12,
            maxLength: 128,
            writeOnly: true,
          },
        },
      },

      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },

      ResetPasswordRequest: {
        type: "object",
        required: ["tokenHash", "newPassword"],
        properties: {
          tokenHash: { type: "string", writeOnly: true },
          newPassword: {
            type: "string",
            minLength: 12,
            maxLength: 128,
            writeOnly: true,
          },
        },
      },

      ProvisionUserRequest: {
        type: "object",
        required: ["fullName", "email", "role"],
        properties: {
          fullName: { type: "string" },
          email: { type: "string", format: "email" },
          role: {
            type: "string",
            enum: ["TEACHER", "STUDENT"],
          },
          employeeId: { type: "string" },
          studentNumber: { type: "string" },
          departmentId: { type: "string", format: "uuid" },
          phone: { type: "string" },
        },
      },
    },
  },
};

export default authOpenApi;
