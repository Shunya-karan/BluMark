import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(), resolveAuthenticatedContext: vi.fn(), getCurrentUser: vi.fn(),
  refreshSession: vi.fn(), logout: vi.fn(), provisionUser: vi.fn(), provisionUsers: vi.fn(),
  changePassword: vi.fn(), requestActivation: vi.fn(), activateAccount: vi.fn(),
  forgotPassword: vi.fn(), resetPassword: vi.fn(),
}));

vi.mock("../src/modules/auth/auth.service.js", () => ({ ...mocks }));
vi.mock("../src/repositories/database.repository.js", () => ({
  checkDatabaseConnection: vi.fn(), disconnectDatabase: vi.fn(),
}));

const { default: app } = await import("../src/app.js");
const id = "10000000-0000-4000-8000-000000000001";
const institutionId = "20000000-0000-4000-8000-000000000001";
const profile = { id, institutionId, fullName: "BluMark User", role: "INSTITUTION_ADMIN" };
const loginResult = {
  accessToken: "access.jwt", refreshToken: "opaque-refresh-token-value-long-enough-for-schema",
  tokenType: "Bearer", expiresIn: 900, profile,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.login.mockResolvedValue(loginResult);
  mocks.resolveAuthenticatedContext.mockResolvedValue({
    authUser: { id }, user: profile, institutionId, sessionId: "session-family",
  });
  mocks.getCurrentUser.mockResolvedValue(profile);
  mocks.refreshSession.mockResolvedValue(loginResult);
  mocks.logout.mockResolvedValue({ revoked: true });
  mocks.provisionUser.mockResolvedValue({ profileId: id, activationRequired: true });
  mocks.provisionUsers.mockResolvedValue({ created: 0, failed: 0, results: [] });
  mocks.changePassword.mockResolvedValue({ changed: true, sessionsRevoked: true });
  mocks.requestActivation.mockResolvedValue({ message: "If an eligible account exists, activation instructions will be sent." });
  mocks.activateAccount.mockResolvedValue({ activated: true });
  mocks.forgotPassword.mockResolvedValue({ message: "If an account exists for that email, password reset instructions will be sent." });
  mocks.resetPassword.mockResolvedValue({ reset: true, sessionsRevoked: true });
});

describe("JWT authentication API", () => {
  it("logs in with normalized credentials and returns application tokens", async () => {
    const response = await request(app).post("/api/v1/auth/login")
      .send({ email: " User@Example.edu ", password: "correct-horse-battery" });
    expect(response.status).toBe(200);
    expect(mocks.login).toHaveBeenCalledWith(expect.objectContaining({
      email: "user@example.edu", password: "correct-horse-battery",
    }));
    expect(response.body.data.accessToken).toBe("access.jwt");
  });

  it("rejects malformed credentials before calling the service", async () => {
    const response = await request(app).post("/api/v1/auth/login")
      .send({ email: "bad", password: "x", role: "INSTITUTION_ADMIN" });
    expect(response.status).toBe(400);
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("supports browser cookie transport without exposing tokens in JSON", async () => {
    const response = await request(app).post("/api/v1/auth/login")
      .set("X-Auth-Transport", "cookie")
      .send({ email: "user@example.edu", password: "correct-horse-battery" });
    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeUndefined();
    expect(response.headers["set-cookie"].join(" ")).toContain("HttpOnly");
  });

  it("requires authentication for protected account endpoints", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/change-password").send({})).status).toBe(401);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("loads the profile from trusted authenticated context", async () => {
    const response = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer valid.jwt");
    expect(response.status).toBe(200);
    expect(mocks.resolveAuthenticatedContext).toHaveBeenCalledWith("valid.jwt");
    expect(mocks.getCurrentUser).toHaveBeenCalledWith(id);
  });

  it("validates bounded bulk provisioning requests and accepts batches up to 100", async () => {
    const users = Array.from({ length: 100 }, (_, index) => ({
      fullName: `Student ${index}`, email: `student${index}@example.edu`, role: "STUDENT", studentNumber: `S-${index}`,
    }));
    const response = await request(app).post("/api/v1/auth/provision-users")
      .set("Authorization", "Bearer valid.jwt").send({ users });
    expect(response.status).toBe(200);
    expect(mocks.provisionUsers).toHaveBeenCalledWith(profile, users);
    const tooMany = await request(app).post("/api/v1/auth/provision-users")
      .set("Authorization", "Bearer valid.jwt").send({ users: [...users, users[0]] });
    expect(tooMany.status).toBe(400);
  });

  it("does not expose reset request account existence", async () => {
    const response = await request(app).post("/api/v1/auth/forgot-password")
      .send({ email: "unknown@example.edu" });
    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/if an account exists/i);
  });

  it("documents all authentication endpoints", async () => {
    const response = await request(app).get("/api/docs.json");
    expect(response.status).toBe(200);
    for (const path of [
      "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout",
      "/api/v1/auth/me", "/api/v1/auth/provision-user", "/api/v1/auth/provision-users",
      "/api/v1/auth/activation/request", "/api/v1/auth/activation/complete",
      "/api/v1/auth/change-password", "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
    ]) expect(response.body.paths[path]).toBeDefined();
  });
});
