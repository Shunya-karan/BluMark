import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const m = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  findProfileById: vi.fn(),
  findProfileByInstitutionAndEmail: vi.fn(),
  findActiveInstitutionById: vi.fn(),
  findActiveDepartmentById: vi.fn(),
  createProfileWithDetails: vi.fn(),
  signIn: vi.fn(),
  refresh: vi.fn(),
  resetEmail: vi.fn(),
  verifyOtp: vi.fn(),
  invite: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("../src/modules/auth/auth.repository.js", () => ({
  findProfileById: m.findProfileById,
  findProfileByInstitutionAndEmail: m.findProfileByInstitutionAndEmail,
  findActiveInstitutionById: m.findActiveInstitutionById,
  findActiveDepartmentById: m.findActiveDepartmentById,
  createProfileWithDetails: m.createProfileWithDetails,
}));
vi.mock("../src/repositories/database.repository.js", () => ({
  checkDatabaseConnection: vi.fn(),
  disconnectDatabase: vi.fn(),
}));
vi.mock("../src/config/supabase.js", () => ({
  verifyAccessToken: m.verifyAccessToken,
  createPublicAuthClient: () => ({
    auth: {
      signInWithPassword: m.signIn,
      refreshSession: m.refresh,
      resetPasswordForEmail: m.resetEmail,
      verifyOtp: m.verifyOtp,
    },
  }),
  createAdminAuthClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: m.invite,
        deleteUser: m.deleteUser,
        signOut: m.signOut,
        updateUserById: m.updateUser,
      },
    },
  }),
}));

const { default: app } = await import("../src/app.js");
const uid = "10000000-0000-4000-8000-000000000001";
const institutionId = "20000000-0000-4000-8000-000000000001";
const departmentId = "30000000-0000-4000-8000-000000000001";
function profile(role = "INSTITUTION_ADMIN", active = true) {
  return {
    id: uid,
    institutionId,
    fullName: "BluMark User",
    email: "user@example.edu",
    phone: null,
    role,
    isActive: active,
    institution: {
      id: institutionId,
      name: "BluMark Demo",
      code: "DEMO",
      type: "UNIVERSITY",
      isActive: true,
    },
    studentDetails: null,
    teacherDetails: null,
  };
}
const session = {
  access_token: "access.jwt",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 1999999999,
};
function bearer() {
  return { Authorization: "Bearer access.jwt" };
}
beforeEach(() => {
  vi.clearAllMocks();
  m.verifyAccessToken.mockResolvedValue({ id: uid, email: "user@example.edu" });
  m.findProfileById.mockResolvedValue(profile());
  m.findProfileByInstitutionAndEmail.mockResolvedValue(null);
  m.findActiveInstitutionById.mockResolvedValue({
    id: institutionId,
    name: "BluMark Demo",
    code: "DEMO",
    type: "UNIVERSITY",
  });
  m.findActiveDepartmentById.mockResolvedValue({
    id: departmentId,
    name: "Computer Science",
    code: "CSE",
  });
  m.createProfileWithDetails.mockResolvedValue(profile("STUDENT"));
  m.signIn.mockResolvedValue({
    data: { user: { id: uid }, session },
    error: null,
  });
  m.refresh.mockResolvedValue({
    data: { user: { id: uid }, session },
    error: null,
  });
  m.resetEmail.mockResolvedValue({ data: {}, error: null });
  m.verifyOtp.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  m.invite.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  m.deleteUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  m.signOut.mockResolvedValue({ error: null });
  m.updateUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
});

describe("Blu-Mark auth API", () => {
  it("logs in through Supabase and returns a sanitized application profile", async () => {
    const r = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@example.edu", password: "valid-password" });
    expect(r.status).toBe(200);
    expect(r.body.data.accessToken).toBe("access.jwt");
    expect(r.body.data.profile.role).toBe("INSTITUTION_ADMIN");
    expect(r.body.data.profile.institution.name).toBe("BluMark Demo");
  });
  it("rejects invalid login credentials", async () => {
    m.signIn.mockResolvedValue({ data: {}, error: { message: "invalid" } });
    const r = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@example.edu", password: "wrong" });
    expect(r.status).toBe(401);
    expect(r.body.message).toMatch(/invalid email or password/i);
  });
  it("rejects missing and invalid bearer tokens", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    m.verifyAccessToken.mockResolvedValue(null);
    expect(
      (await request(app).get("/api/v1/auth/me").set(bearer())).status,
    ).toBe(401);
  });
  it("rejects valid Supabase users with no Profile", async () => {
    m.findProfileById.mockResolvedValue(null);
    expect(
      (await request(app).get("/api/v1/auth/me").set(bearer())).status,
    ).toBe(403);
  });
  it("rejects inactive profiles", async () => {
    m.findProfileById.mockResolvedValue(profile("STUDENT", false));
    expect(
      (await request(app).get("/api/v1/auth/me").set(bearer())).status,
    ).toBe(403);
  });
  it("returns the current sanitized profile", async () => {
    const r = await request(app).get("/api/v1/auth/me").set(bearer());
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(uid);
    expect(r.body.data.role).toBe("INSTITUTION_ADMIN");
  });
  it.each(["STUDENT", "TEACHER"])("%s cannot provision users", async (role) => {
    m.findProfileById.mockResolvedValue(profile(role));
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "Another",
        email: "another@example.edu",
        role: "STUDENT",
        studentNumber: "S-1",
      });
    expect(r.status).toBe(403);
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("allows an institution admin to provision a student in their institution", async () => {
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Student",
        email: "new@example.edu",
        role: "STUDENT",
        studentNumber: "S-10",
      });
    expect(r.status).toBe(201);
    expect(m.invite).toHaveBeenCalledWith(
      "new@example.edu",
      expect.any(Object),
    );
    expect(m.createProfileWithDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: uid,
        institutionId,
        input: expect.objectContaining({
          role: "STUDENT",
          studentNumber: "S-10",
        }),
      }),
    );
  });
  it("rejects a teacher department outside the caller institution", async () => {
    m.findActiveDepartmentById.mockResolvedValue(null);
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Teacher",
        email: "teacher@example.edu",
        role: "TEACHER",
        employeeId: "E-1",
        departmentId,
      });
    expect(r.status).toBe(422);
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("rejects duplicate application email or identifiers before inviting", async () => {
    m.findProfileByInstitutionAndEmail.mockResolvedValue({ id: "existing" });
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Student",
        email: "new@example.edu",
        role: "STUDENT",
        studentNumber: "S-10",
      });
    expect(r.status).toBe(409);
    expect(m.invite).not.toHaveBeenCalled();
  });
  it("compensates Auth user creation when database details creation fails", async () => {
    m.createProfileWithDetails.mockRejectedValue(new Error("database failure"));
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Student",
        email: "new@example.edu",
        role: "STUDENT",
        studentNumber: "S-10",
      });
    expect(r.status).toBe(500);
    expect(m.deleteUser).toHaveBeenCalledWith(uid);
  });
  it("rejects invalid refresh tokens", async () => {
    m.refresh.mockResolvedValue({ data: {}, error: { message: "expired" } });
    const r = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "expired-token" });
    expect(r.status).toBe(401);
  });
  it("returns the same generic password recovery response", async () => {
    m.resetEmail.mockResolvedValue({
      data: {},
      error: { message: "unknown email" },
    });
    const r = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "unknown@example.edu" });
    expect(r.status).toBe(200);
    expect(r.body.message).toMatch(/if an account exists/i);
  });
  it("serves Swagger UI and a spec containing every required auth endpoint", async () => {
    const docsUi = await request(app).get("/api/docs/");
    expect(docsUi.status).toBe(200);
    expect(docsUi.headers["content-security-policy"]).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    const r = await request(app).get("/api/docs.json");
    expect(r.status).toBe(200);
    for (const path of [
      "/api/v1/auth/login",
      "/api/v1/auth/me",
      "/api/v1/auth/refresh",
      "/api/v1/auth/logout",
      "/api/v1/auth/provision-user",
      "/api/v1/auth/change-password",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/reset-password",
    ])
      expect(r.body.paths[path]).toBeDefined();
  });
  it("revokes the current Supabase session on logout", async () => {
    const r = await request(app).post("/api/v1/auth/logout").set(bearer());
    expect(r.status).toBe(200);
    expect(m.signOut).toHaveBeenCalledWith("access.jwt", "local");
  });
  it("changes only the authenticated user's password", async () => {
    const r = await request(app)
      .post("/api/v1/auth/change-password")
      .set(bearer())
      .send({
        currentPassword: "current-password",
        newPassword: "a-strong-password-123",
      });
    expect(r.status).toBe(200);
    expect(m.signIn).toHaveBeenCalledWith({
      email: "user@example.edu",
      password: "current-password",
    });
    expect(m.updateUser).toHaveBeenCalledWith(uid, {
      password: "a-strong-password-123",
    });
  });
  it("verifies a Supabase recovery token before resetting a password", async () => {
    const r = await request(app).post("/api/v1/auth/reset-password").send({
      tokenHash: "recovery-hash",
      newPassword: "a-strong-password-123",
    });
    expect(r.status).toBe(200);
    expect(m.verifyOtp).toHaveBeenCalledWith({
      token_hash: "recovery-hash",
      type: "recovery",
    });
    expect(m.updateUser).toHaveBeenCalledWith(uid, {
      password: "a-strong-password-123",
    });
  });
  it("provisions teachers and assigns only an active department in the caller's institution", async () => {
    m.createProfileWithDetails.mockResolvedValue(profile("TEACHER"));
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Teacher",
        email: "teacher@example.edu",
        role: "TEACHER",
        employeeId: "EMP-9",
        departmentId,
      });
    expect(r.status).toBe(201);
    expect(m.createProfileWithDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: uid,
        institutionId,
        input: expect.objectContaining({
          role: "TEACHER",
          employeeId: "EMP-9",
          departmentId,
        }),
      }),
    );
  });
  it("rejects a repeated identifier after the Auth invite and compensates", async () => {
    m.createProfileWithDetails.mockRejectedValue({ code: "P2002" });
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Student",
        email: "new@example.edu",
        role: "STUDENT",
        studentNumber: "S-10",
      });
    expect(r.status).toBe(409);
    expect(m.deleteUser).toHaveBeenCalledWith(uid);
  });
  it("requires the current password before changing it", async () => {
    m.signIn.mockResolvedValue({ data: {}, error: { message: "invalid" } });
    const r = await request(app)
      .post("/api/v1/auth/change-password")
      .set(bearer())
      .send({
        currentPassword: "wrong-password",
        newPassword: "a-strong-password-123",
      });
    expect(r.status).toBe(401);
    expect(m.updateUser).not.toHaveBeenCalled();
  });
  it("reports when provisioning compensation also fails", async () => {
    m.createProfileWithDetails.mockRejectedValue(new Error("database failure"));
    m.deleteUser.mockRejectedValue(new Error("provider unavailable"));
    const r = await request(app)
      .post("/api/v1/auth/provision-user")
      .set(bearer())
      .send({
        fullName: "New Student",
        email: "new@example.edu",
        role: "STUDENT",
        studentNumber: "S-10",
      });
    expect(r.status).toBe(500);
    expect(r.body.message).toMatch(/contact support/i);
  });
  it("rejects malformed payloads and strips no unexpected mass-assignment fields", async () => {
    const r = await request(app).post("/api/v1/auth/login").send({
      email: "not-an-email",
      password: "x",
      role: "INSTITUTION_ADMIN",
    });
    expect(r.status).toBe(400);
    expect(m.signIn).not.toHaveBeenCalled();
  });
});
