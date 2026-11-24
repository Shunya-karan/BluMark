import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findTeacherProfile: vi.fn(),
  findTeacherClassSubject: vi.fn(),
  findTeacherTimetableSlot: vi.fn(),
  createTeacherAttendanceSession: vi.fn(),
  endTeacherAttendanceSession: vi.fn(),
  manuallyMarkStudentAttendance: vi.fn(),
  bulkMarkStudentsAttendance: vi.fn(),
}));

vi.mock("../src/modules/teachers/teacher.repository.js", () => repository);
vi.mock("../src/utils/s3Storage.js", () => ({
  uploadStudyMaterial: vi.fn(),
  deleteStudyMaterialObject: vi.fn(),
  getStudyMaterialSignedUrl: vi.fn(),
}));

const service = await import("../src/modules/teachers/teacher.service.js");
const validate = (await import("../src/middleware/validate.js")).default;
const { createAttendanceSessionSchema } = await import(
  "../src/modules/teachers/teacher.validation.js"
);

const teacher = {
  id: "10000000-0000-4000-8000-000000000001",
  institutionId: "20000000-0000-4000-8000-000000000001",
  role: "TEACHER",
};
const assignment = {
  id: "30000000-0000-4000-8000-000000000001",
  schoolClass: { name: "Class 10 A" },
  subject: { code: "MATH 101" },
};

beforeEach(() => {
  vi.clearAllMocks();
  repository.findTeacherProfile.mockResolvedValue({ id: teacher.id });
});

describe("teacher attendance session service", () => {
  it("creates an authorized session with its configured duration and existing code format", async () => {
    repository.findTeacherClassSubject.mockResolvedValue(assignment);
    repository.createTeacherAttendanceSession.mockImplementation(async (input) => ({
      conflict: false,
      session: {
        id: "40000000-0000-4000-8000-000000000001",
        sessionCode: input.sessionCode,
      },
    }));

    const before = Date.now();
    const result = await service.createAttendanceSession(teacher, {
      classSubjectId: assignment.id,
      durationMinutes: 25,
    });
    const after = Date.now();
    const input = repository.createTeacherAttendanceSession.mock.calls[0][0];

    expect(repository.findTeacherClassSubject).toHaveBeenCalledWith(
      teacher.id,
      teacher.institutionId,
      assignment.id,
    );
    expect(input.startsAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(input.startsAt.getTime()).toBeLessThanOrEqual(after);
    expect(input.expiresAt.getTime() - input.startsAt.getTime()).toBe(25 * 60 * 1000);
    expect(input.bleTokenSeed).toMatch(/^[a-f0-9]{64}$/);
    expect(input.sessionCode).toMatch(/^CLASS10A-MATH101-\d{1,3}-\d{4}$/);
    expect(result.session.sessionCode).toBe(input.sessionCode);
  });

  it("does not create sessions for class-subject assignments the teacher cannot access", async () => {
    repository.findTeacherClassSubject.mockResolvedValue(null);

    await expect(service.createAttendanceSession(teacher, {
      classSubjectId: assignment.id,
    })).rejects.toMatchObject({ statusCode: 404 });

    expect(repository.createTeacherAttendanceSession).not.toHaveBeenCalled();
  });

  it("reports invalid creation fields and unknown body fields to the API caller", () => {
    const next = vi.fn();
    validate(createAttendanceSessionSchema)(
      {
        body: {
          classSubjectId: "not-a-uuid",
          durationMinutes: 0,
          unexpected: true,
        },
      },
      {},
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      details: expect.arrayContaining([
        expect.objectContaining({ field: "classSubjectId" }),
        expect.objectContaining({ field: "durationMinutes" }),
        expect.objectContaining({ field: "body" }),
      ]),
    }));
  });

  it("returns an expired terminal state safely from repeated end requests", async () => {
    const session = { id: "session-id", status: "EXPIRED" };
    repository.endTeacherAttendanceSession.mockResolvedValue({ session });

    const result = await service.endAttendanceSession(teacher, session.id);

    expect(result).toEqual({
      message: "Attendance session has expired",
      session,
    });
  });

  it("treats a repeated identical manual attendance submission as successful", async () => {
    const record = { id: "record-id", status: "PRESENT", method: "MANUAL" };
    repository.manuallyMarkStudentAttendance.mockResolvedValue({
      conflict: false,
      alreadyMarked: true,
      record,
    });

    const result = await service.manuallyMarkStudentAttendance(
      teacher,
      "session-id",
      { studentId: "student-id", status: "PRESENT" },
    );

    expect(result.record).toBe(record);
    expect(result.message).toBe("Student attendance marked successfully");
  });

  it("does not treat a conflicting duplicate attendance submission as a successful retry", async () => {
    repository.manuallyMarkStudentAttendance.mockResolvedValue({
      alreadyMarked: true,
      existingRecord: { id: "record-id", status: "ABSENT" },
    });

    await expect(service.manuallyMarkStudentAttendance(
      teacher,
      "session-id",
      { studentId: "student-id", status: "PRESENT" },
    )).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns successful bulk results for safe retries", async () => {
    const records = [{ id: "record-id", status: "PRESENT" }];
    repository.bulkMarkStudentsAttendance.mockResolvedValue({ success: true, records });

    const result = await service.bulkMarkStudentsAttendance(
      teacher,
      "session-id",
      { records: [{ studentId: "student-id", status: "PRESENT" }] },
    );

    expect(result.totalMarked).toBe(1);
    expect(result.records).toBe(records);
  });
});
