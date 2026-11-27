import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const m = vi.hoisted(() => ({
  resolveAuthenticatedContext: vi.fn(),
  updateStudent: vi.fn(),
  updateTeacher: vi.fn(),
  listStudents: vi.fn(),
  listTeachers: vi.fn(),
  listAttendanceSessions: vi.fn(),
  getAttendanceSessionDetails: vi.fn(),
  listDepartments: vi.fn(),
  listClasses: vi.fn(),
  listSubjects: vi.fn(),
}));

vi.mock("../src/modules/auth/auth.service.js", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveAuthenticatedContext: m.resolveAuthenticatedContext,
}));
vi.mock("../src/modules/admin/users/user.service.js", () => ({
  updateStudent: m.updateStudent,
  updateTeacher: m.updateTeacher,
  listStudents: m.listStudents,
  listTeachers: m.listTeachers,
}));
vi.mock("../src/modules/admin/academics/academic.service.js", async (importOriginal) => ({
  ...(await importOriginal()),
  listDepartments: m.listDepartments,
  listClasses: m.listClasses,
  listSubjects: m.listSubjects,
}));
vi.mock("../src/modules/admin/admin.service.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    listAttendanceSessions: m.listAttendanceSessions,
    getAttendanceSessionDetails: m.getAttendanceSessionDetails,
  };
});
vi.mock("../src/repositories/database.repository.js", () => ({
  checkDatabaseConnection: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

const { default: app } = await import("../src/app.js");

const admin = {
  id: "10000000-0000-4000-8000-000000000001",
  institutionId: "20000000-0000-4000-8000-000000000001",
  role: "INSTITUTION_ADMIN",
};

const studentId = "30000000-0000-4000-8000-000000000001";
const teacherId = "40000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  m.resolveAuthenticatedContext.mockResolvedValue({
    user: admin,
    institutionId: admin.institutionId,
    sessionId: "family",
    authUser: { id: admin.id },
  });
});

describe("Admin edit students and teachers API", () => {
  it("allows updating student details", async () => {
    m.updateStudent.mockResolvedValue({
      id: studentId,
      fullName: "Updated Student",
      studentDetails: { studentNumber: "STU-999" },
    });

    const response = await request(app)
      .patch(`/api/v1/admin/students/${studentId}`)
      .set("Authorization", "Bearer valid.token")
      .send({
        fullName: "Updated Student",
        studentNumber: "STU-999",
        phone: "1234567890",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(m.updateStudent).toHaveBeenCalledWith(
      expect.objectContaining({ role: "INSTITUTION_ADMIN" }),
      studentId,
      expect.objectContaining({
        fullName: "Updated Student",
        studentNumber: "STU-999",
      }),
    );
  });

  it("allows updating teacher details", async () => {
    m.updateTeacher.mockResolvedValue({
      id: teacherId,
      fullName: "Updated Teacher",
      teacherDetails: { employeeId: "EMP-999" },
    });

    const response = await request(app)
      .patch(`/api/v1/admin/teachers/${teacherId}`)
      .set("Authorization", "Bearer valid.token")
      .send({
        fullName: "Updated Teacher",
        employeeId: "EMP-999",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(m.updateTeacher).toHaveBeenCalledWith(
      expect.objectContaining({ role: "INSTITUTION_ADMIN" }),
      teacherId,
      expect.objectContaining({
        fullName: "Updated Teacher",
        employeeId: "EMP-999",
      }),
    );
  });

  it("returns attendance sessions for admin", async () => {
    m.listAttendanceSessions.mockResolvedValue({
      sessions: [{ id: "50000000-0000-4000-8000-000000000001", status: "ACTIVE" }],
      pagination: { page: 1, limit: 10, total: 1 },
    });

    const response = await request(app)
      .get("/api/v1/admin/attendance/sessions")
      .set("Authorization", "Bearer valid.token");

    expect(response.status).toBe(200);
    expect(response.body.data.sessions).toHaveLength(1);
  });

  it("accepts limit=100 on admin directory list endpoints for dropdowns", async () => {
    m.listDepartments.mockResolvedValue({ items: [], departments: [], pagination: {} });
    m.listClasses.mockResolvedValue({ items: [], classes: [], pagination: {} });
    m.listSubjects.mockResolvedValue({ items: [], subjects: [], pagination: {} });
    m.listTeachers.mockResolvedValue({ teachers: [], pagination: {} });

    const [deptRes, classRes, subjRes, teachRes] = await Promise.all([
      request(app).get("/api/v1/admin/departments?limit=100&isActive=true").set("Authorization", "Bearer valid.token"),
      request(app).get("/api/v1/admin/classes?limit=100&isActive=true").set("Authorization", "Bearer valid.token"),
      request(app).get("/api/v1/admin/subjects?limit=100&isActive=true").set("Authorization", "Bearer valid.token"),
      request(app).get("/api/v1/admin/teachers?limit=100&isActive=true").set("Authorization", "Bearer valid.token"),
    ]);

    expect(deptRes.status).toBe(200);
    expect(classRes.status).toBe(200);
    expect(subjRes.status).toBe(200);
    expect(teachRes.status).toBe(200);
  });
});
