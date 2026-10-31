import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const m = vi.hoisted(() => ({
  resolveAuthenticatedContext: vi.fn(),
  getDashboard: vi.fn(), getProfile: vi.fn(), editProfile: vi.fn(),
  getAttendanceSummary: vi.fn(), getAttendanceHistory: vi.fn(), getAttendanceCalendar: vi.fn(), getAttendanceSubjects: vi.fn(),
  getTimetable: vi.fn(), getTodayTimetable: vi.fn(), getUpcomingTimetable: vi.fn(),
  getSubjects: vi.fn(), getSubject: vi.fn(), getStudyMaterials: vi.fn(), getStudyMaterial: vi.fn(),
  getNotifications: vi.fn(), getNotification: vi.fn(), readNotification: vi.fn(), readAllNotifications: vi.fn(),
  getDevice: vi.fn(), registerDevice: vi.fn(), requestDeviceReplacement: vi.fn(),
}));

vi.mock("../src/modules/auth/auth.service.js", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveAuthenticatedContext: m.resolveAuthenticatedContext,
}));
vi.mock("../src/modules/students/student.service.js", () => ({ ...m }));
vi.mock("../src/repositories/database.repository.js", () => ({
  checkDatabaseConnection: vi.fn(), disconnectDatabase: vi.fn(),
}));

const { default: app } = await import("../src/app.js");
const student = { id: "10000000-0000-4000-8000-000000000001", institutionId: "20000000-0000-4000-8000-000000000001", role: "STUDENT" };

beforeEach(() => {
  vi.clearAllMocks();
  m.resolveAuthenticatedContext.mockResolvedValue({ user: student, institutionId: student.institutionId, sessionId: "family", authUser: { id: student.id } });
  m.getDashboard.mockResolvedValue({ profile: student });
  m.getProfile.mockResolvedValue(student);
  m.getAttendanceSummary.mockResolvedValue({ totalSessions: 0 });
  m.getTimetable.mockResolvedValue({ slots: [] });
  m.getSubjects.mockResolvedValue({ subjects: [] });
  m.getNotifications.mockResolvedValue({ notifications: [], pagination: {} });
  m.getDevice.mockResolvedValue({ activeDevice: null, pendingDevice: null });
});

describe("student API access boundary", () => {
  it("requires a JWT", async () => {
    expect((await request(app).get("/api/v1/student/dashboard")).status).toBe(401);
  });

  it("rejects non-student roles before reaching a student service", async () => {
    m.resolveAuthenticatedContext.mockResolvedValueOnce({
      user: { ...student, role: "TEACHER" }, institutionId: student.institutionId, sessionId: "family", authUser: { id: student.id },
    });
    const response = await request(app).get("/api/v1/student/dashboard").set("Authorization", "Bearer token");
    expect(response.status).toBe(403);
    expect(m.getDashboard).not.toHaveBeenCalled();
  });

  it("uses only the JWT-derived student identity for dashboard access", async () => {
    const response = await request(app).get("/api/v1/student/dashboard").set("Authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(m.getDashboard).toHaveBeenCalledWith(student);
  });

  it("allows only editable profile fields", async () => {
    const bad = await request(app).patch("/api/v1/student/profile").set("Authorization", "Bearer token")
      .send({ role: "INSTITUTION_ADMIN" });
    expect(bad.status).toBe(400);
    const good = await request(app).patch("/api/v1/student/profile").set("Authorization", "Bearer token")
      .send({ fullName: "Updated Student", phone: "9999999999" });
    expect(good.status).toBe(200);
    expect(m.editProfile).toHaveBeenCalledWith(student, { fullName: "Updated Student", phone: "9999999999" });
  });

  it("validates private resource IDs and does not accept a student ID in routes", async () => {
    const invalid = await request(app).get("/api/v1/student/subjects/not-a-uuid").set("Authorization", "Bearer token");
    expect(invalid.status).toBe(400);
    expect(m.getSubject).not.toHaveBeenCalled();
  });

  it("publishes student routes in the existing Swagger document", async () => {
    const response = await request(app).get("/api/docs.json");
    expect(response.status).toBe(200);
    expect(response.body.paths["/api/v1/student/dashboard"]).toBeDefined();
    expect(response.body.paths["/api/v1/student/study-materials"]).toBeDefined();
    expect(response.body.paths["/api/v1/student/notifications/{notificationId}/read"]).toBeDefined();
  });
});
