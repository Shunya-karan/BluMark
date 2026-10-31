import prisma from "../../config/prisma.js";

const profileInclude = {
  institution: { select: { id: true, name: true, code: true, type: true, isActive: true } },
  studentDetails: { select: { studentNumber: true } },
};

const sessionInclude = {
  classSubject: {
    select: {
      classId: true,
      subject: { select: { id: true, name: true, code: true } },
      schoolClass: { select: { id: true, name: true, division: true, academicYear: true, semester: true } },
      teacher: { select: { id: true, fullName: true } },
    },
  },
  timetableSlot: { select: { id: true, startTime: true, endTime: true, room: true, weekday: true } },
};

export function findStudentProfile(profileId, institutionId) {
  return prisma.profile.findFirst({
    where: { id: profileId, institutionId, role: "STUDENT", isActive: true },
    include: profileInclude,
  });
}

export function updateStudentProfile(profileId, institutionId, data) {
  return prisma.profile.update({
    where: { id_institutionId: { id: profileId, institutionId } },
    data,
    include: profileInclude,
  });
}

export function findActiveEnrollments(studentId, institutionId) {
  return prisma.enrollment.findMany({
    where: { studentId, institutionId, isActive: true, schoolClass: { isActive: true } },
    orderBy: { enrolledAt: "desc" },
    include: {
      schoolClass: {
        select: {
          id: true, name: true, division: true, academicYear: true, semester: true,
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export function findEligibleSessions({ institutionId, studentId, classIds, enrolledAfter, filters = {}, skip, take }) {
  const startsAt = {};
  if (enrolledAfter) startsAt.gte = enrolledAfter;
  if (filters.from) startsAt.gte = filters.from;
  if (filters.to) startsAt.lte = filters.to;
  return prisma.attendanceSession.findMany({
    where: {
      institutionId,
      status: { in: ["COMPLETED", "EXPIRED"] },
      startsAt,
      classSubject: {
        classId: { in: classIds },
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
    },
    orderBy: { startsAt: "desc" },
    ...(skip === undefined ? {} : { skip, take }),
    include: {
      ...sessionInclude,
      records: {
        where: { studentId, institutionId },
        select: { id: true, status: true, markedAt: true, method: true },
      },
    },
  });
}

export function countEligibleSessions({ institutionId, classIds, enrolledAfter, filters = {} }) {
  const startsAt = {};
  if (enrolledAfter) startsAt.gte = enrolledAfter;
  if (filters.from) startsAt.gte = filters.from;
  if (filters.to) startsAt.lte = filters.to;
  return prisma.attendanceSession.count({
    where: {
      institutionId,
      status: { in: ["COMPLETED", "EXPIRED"] },
      startsAt,
      classSubject: {
        classId: { in: classIds },
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
    },
  });
}

export function findTimetableSlots(institutionId, classIds, weekday) {
  return prisma.timetableSlot.findMany({
    where: {
      institutionId, isActive: true,
      ...(weekday ? { weekday } : {}),
      classSubject: { classId: { in: classIds } },
    },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    include: {
      classSubject: {
        select: {
          classId: true,
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, fullName: true } },
          schoolClass: { select: { id: true, name: true, division: true } },
        },
      },
    },
  });
}

export function findSubjects(institutionId, classIds) {
  return prisma.classSubject.findMany({
    where: { institutionId, classId: { in: classIds }, subject: { isActive: true } },
    orderBy: { subject: { name: "asc" } },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, fullName: true } },
      schoolClass: { select: { id: true, name: true, division: true, academicYear: true, semester: true } },
    },
  });
}

export function findSubjectForStudent(institutionId, classIds, subjectId) {
  return prisma.classSubject.findFirst({
    where: { institutionId, classId: { in: classIds }, subjectId, subject: { isActive: true } },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, fullName: true } },
      schoolClass: { select: { id: true, name: true, division: true, academicYear: true, semester: true } },
    },
  });
}

export function findStudyMaterials({ institutionId, classIds, subjectId, search, from, to, skip, take }) {
  return prisma.studyMaterial.findMany({
    where: {
      institutionId,
      classSubject: {
        classId: { in: classIds },
        ...(subjectId ? { subjectId } : {}),
      },
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip, take,
    include: {
      classSubject: { include: { subject: { select: { id: true, name: true, code: true } }, teacher: { select: { id: true, fullName: true } } } },
    },
  });
}

export function countStudyMaterials({ institutionId, classIds, subjectId, search, from, to }) {
  return prisma.studyMaterial.count({
    where: {
      institutionId,
      classSubject: { classId: { in: classIds }, ...(subjectId ? { subjectId } : {}) },
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
  });
}

export function findStudyMaterial(institutionId, classIds, materialId) {
  return prisma.studyMaterial.findFirst({
    where: { id: materialId, institutionId, classSubject: { classId: { in: classIds } } },
    include: {
      classSubject: { include: { subject: { select: { id: true, name: true, code: true } }, teacher: { select: { id: true, fullName: true } } } },
    },
  });
}

export function findNotifications({ institutionId, recipientId, unread, skip, take }) {
  return prisma.notification.findMany({
    where: { institutionId, recipientId, ...(unread ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    skip, take,
    select: { id: true, title: true, body: true, type: true, readAt: true, createdAt: true },
  });
}

export function countNotifications({ institutionId, recipientId, unread }) {
  return prisma.notification.count({ where: { institutionId, recipientId, ...(unread ? { readAt: null } : {}) } });
}

export function findNotification(institutionId, recipientId, id) {
  return prisma.notification.findFirst({
    where: { id, institutionId, recipientId },
    select: { id: true, title: true, body: true, type: true, readAt: true, createdAt: true },
  });
}

export function markNotificationRead(institutionId, recipientId, id) {
  return prisma.notification.updateMany({
    where: { id, institutionId, recipientId, readAt: null },
    data: { readAt: new Date() },
  });
}

export function markAllNotificationsRead(institutionId, recipientId) {
  return prisma.notification.updateMany({ where: { institutionId, recipientId, readAt: null }, data: { readAt: new Date() } });
}

export function findStudentDevices(institutionId, profileId) {
  return prisma.device.findMany({
    where: { institutionId, profileId },
    orderBy: { registeredAt: "desc" },
    select: { id: true, deviceIdentifier: true, status: true, registeredAt: true, reviewedAt: true, rejectionReason: true },
  });
}

export function registerPendingDevice({ institutionId, profileId, deviceIdentifier, publicKey }) {
  return prisma.$transaction(async (tx) => {
    const activeOrPending = await tx.device.findFirst({
      where: { institutionId, profileId, status: { in: ["ACTIVE", "PENDING"] } },
      select: { id: true, status: true },
    });
    if (activeOrPending) return { kind: activeOrPending.status === "ACTIVE" ? "active_exists" : "pending_exists" };
    const used = await tx.device.findFirst({ where: { institutionId, deviceIdentifier }, select: { id: true } });
    if (used) return { kind: "identifier_in_use" };
    const device = await tx.device.create({ data: { institutionId, profileId, deviceIdentifier, publicKey, status: "PENDING" } });
    await tx.auditLog.create({ data: { institutionId, actorId: profileId, action: "DEVICE_REGISTRATION_REQUESTED", entityType: "DEVICE", entityId: device.id } });
    return { kind: "created", device };
  });
}

export function createReplacementRequest({ institutionId, profileId, deviceIdentifier, publicKey, reason }) {
  return prisma.$transaction(async (tx) => {
    const activeDevice = await tx.device.findFirst({ where: { institutionId, profileId, status: "ACTIVE" }, select: { id: true } });
    if (!activeDevice) return { kind: "no_active_device" };
    const pending = await tx.deviceReplacementRequest.findFirst({ where: { institutionId, profileId, status: "PENDING" }, select: { id: true } });
    if (pending) return { kind: "pending_exists" };
    const used = await tx.device.findFirst({ where: { institutionId, deviceIdentifier }, select: { id: true } });
    if (used) return { kind: "identifier_in_use" };
    const request = await tx.deviceReplacementRequest.create({
      data: { institutionId, profileId, requestedDeviceIdentifier: deviceIdentifier, publicKey, reason },
    });
    await tx.auditLog.create({ data: { institutionId, actorId: profileId, action: "DEVICE_REPLACEMENT_REQUESTED", entityType: "DEVICE_REPLACEMENT_REQUEST", entityId: request.id } });
    return { kind: "created", request };
  });
}
