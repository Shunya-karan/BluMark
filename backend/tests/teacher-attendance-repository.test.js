import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    attendanceSession: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    enrollment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    attendanceRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
  };

  return {
    tx,
    $transaction: vi.fn(),
  };
});

vi.mock("../src/config/prisma.js", () => ({ default: prisma }));

const repository = await import("../src/modules/teachers/teacher.repository.js");

const sessionContext = {
  teacherId: "10000000-0000-4000-8000-000000000001",
  institutionId: "20000000-0000-4000-8000-000000000001",
  sessionId: "30000000-0000-4000-8000-000000000001",
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(prisma.tx));
  prisma.tx.attendanceSession.updateMany.mockResolvedValue({ count: 1 });
});

describe("teacher attendance repository lifecycle", () => {
  it("expires an overdue active session when it is ended", async () => {
    const expiresAt = new Date(Date.now() - 1000);
    prisma.tx.attendanceSession.findFirst
      .mockResolvedValueOnce({ status: "ACTIVE", expiresAt })
      .mockResolvedValueOnce({ id: sessionContext.sessionId, status: "EXPIRED" });

    const result = await repository.endTeacherAttendanceSession(sessionContext);

    expect(prisma.tx.attendanceSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
        data: expect.objectContaining({ status: "EXPIRED", endedAt: expect.any(Date) }),
      }),
    );
    expect(result).toEqual({
      conflict: false,
      session: { id: sessionContext.sessionId, status: "EXPIRED" },
    });
  });

  it("returns completed sessions unchanged on repeated end requests", async () => {
    const completed = { id: sessionContext.sessionId, status: "COMPLETED" };
    prisma.tx.attendanceSession.findFirst
      .mockResolvedValueOnce({ status: "COMPLETED", expiresAt: new Date() })
      .mockResolvedValueOnce(completed);

    const result = await repository.endTeacherAttendanceSession(sessionContext);

    expect(result).toEqual({ conflict: false, session: completed });
    expect(prisma.tx.attendanceSession.updateMany).not.toHaveBeenCalled();
  });

  it("does not create another record for an identical manual attendance retry", async () => {
    const now = new Date();
    const record = { id: "record-id", status: "PRESENT", method: "MANUAL" };
    prisma.tx.attendanceSession.findFirst.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(now.getTime() + 60_000),
      classSubject: { classId: "class-id" },
    });
    prisma.tx.enrollment.findFirst.mockResolvedValue({ id: "enrollment-id" });
    prisma.tx.attendanceRecord.findFirst
      .mockResolvedValueOnce({ id: record.id, status: "PRESENT", notes: null })
      .mockResolvedValueOnce(record);

    const result = await repository.manuallyMarkStudentAttendance({
      ...sessionContext,
      studentId: "student-id",
      status: "PRESENT",
    });

    expect(result).toEqual({ conflict: false, record, alreadyMarked: true });
    expect(prisma.tx.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("requires active enrollment before accepting manual attendance", async () => {
    prisma.tx.attendanceSession.findFirst.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 60_000),
      classSubject: { classId: "class-id" },
    });
    prisma.tx.enrollment.findFirst.mockResolvedValue(null);

    const result = await repository.manuallyMarkStudentAttendance({
      ...sessionContext,
      studentId: "student-id",
      status: "PRESENT",
    });

    expect(result).toEqual({ studentNotEnrolled: true });
    expect(prisma.tx.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("expires overdue sessions and rejects late attendance attempts", async () => {
    prisma.tx.attendanceSession.findFirst.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() - 1000),
      classSubject: { classId: "class-id" },
    });

    const result = await repository.manuallyMarkStudentAttendance({
      ...sessionContext,
      studentId: "student-id",
      status: "PRESENT",
    });

    expect(result).toMatchObject({
      conflict: true,
      reason: "SESSION_EXPIRED",
      status: "EXPIRED",
    });
    expect(prisma.tx.attendanceSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EXPIRED" }),
      }),
    );
    expect(prisma.tx.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("returns existing matching bulk records without inserting duplicates", async () => {
    const studentId = "student-id";
    const existing = [{ studentId, status: "PRESENT", notes: null }];
    const record = { id: "record-id", status: "PRESENT", method: "MANUAL" };
    prisma.tx.attendanceSession.findFirst.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 60_000),
      classSubject: { classId: "class-id" },
    });
    prisma.tx.enrollment.findMany.mockResolvedValue([{ studentId }]);
    prisma.tx.attendanceRecord.findMany
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce([record]);

    const result = await repository.bulkMarkStudentsAttendance({
      ...sessionContext,
      records: [{ studentId, status: "PRESENT" }],
    });

    expect(result).toEqual({ success: true, records: [record] });
    expect(prisma.tx.attendanceRecord.createMany).not.toHaveBeenCalled();
  });
});
