import { describe, expect, it } from "vitest";
import request from "supertest";
import openApi from "../src/config/swagger.js";

const { default: app } = await import("../src/app.js");
const documentedRoutes = Object.keys(openApi.paths).map((path) =>
  path.replace(/\{[^}]+\}/g, "test-id"),
);

describe("CORS policy", () => {
  const routeGroups = [
    "/api/health/db",
    "/api/v1/auth/login",
    "/api/v1/student/dashboard",
    "/api/v1/teacher/dashboard",
    "/api/v1/admin/dashboard",
    "/api/docs",
  ];

  it("allows requests without an Origin header", async () => {
    const response = await request(app).get("/api/docs.json");

    expect(response.status).toBe(200);
  });

  it("allows Swagger requests from the backend's own origin", async () => {
    const response = await request(app)
      .get("/api/docs.json")
      .set("Host", "blumark.onrender.com")
      .set("X-Forwarded-Proto", "https")
      .set("Origin", "https://blumark.onrender.com");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://blumark.onrender.com",
    );
  });

  it("allows local Flutter Web origins", async () => {
    const response = await request(app)
      .get("/api/docs.json")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("handles allowed preflight requests", async () => {
    const response = await request(app)
      .options("/api/v1/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  it.each(routeGroups)("handles preflight for %s", async (path) => {
    const response = await request(app)
      .options(path)
      .set("Origin", "http://127.0.0.1:4173")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:4173",
    );
  });

  it.each(documentedRoutes)("handles documented preflight for %s", async (path) => {
    const response = await request(app)
      .options(path)
      .set("Origin", "http://localhost:4173")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:4173",
    );
  });

  it.each([
    ["get", "/api/v1/student/dashboard"],
    ["post", "/api/v1/auth/login"],
    ["put", "/api/v1/admin/students/not-a-uuid/enrollment"],
    ["patch", "/api/v1/teacher/profile"],
    ["delete", "/api/v1/student/device/request-replacement"],
  ])("adds CORS headers to %s %s", async (method, path) => {
    const response = await request(app)
      [method](path)
      .set("Origin", "http://localhost:3000");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects browser origins outside the allowlist", async () => {
    const response = await request(app)
      .get("/api/docs.json")
      .set("Origin", "https://untrusted.example");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Origin is not allowed by CORS",
    });
  });
});
