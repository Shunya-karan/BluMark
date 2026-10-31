import AppError from "../../utils/AppError.js";
import * as repository from "./student.repository.js";

const attendedStatuses = new Set(["PRESENT", "LATE", "EXCUSED"]);

function pagination(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

function sessionStatus(session) {
  return session.records[0]?.status ?? "ABSENT";
}

function toAttendance(session) {
  const record = session.records[0];
  return {
    id: record?.id ?? null,
    date: session.startsAt.toISOString().slice(0, 10),
    sessionId: session.id,
    subject: session.classSubject.subject,
    schoolClass: session.classSubject.schoolClass,
    teacher: session.classSubject.teacher,
    startTime: session.startsAt,
    endTime: session.endedAt ?? session.expiresAt,
    status: sessionStatus(session),
    markedAt: record?.markedAt ?? null,
    method: record?.method ?? null,
  };
}

function attendanceSummary(sessions) {
  const subjects = new Map();
  let present = 0;
  for (const session of sessions) {
    const status = sessionStatus(session);
    if (attendedStatuses.has(status)) present += 1;
    const subject = session.classSubject.subject;
    const value = subjects.get(subject.id) ?? {
      subjectId: subject.id, subjectName: subject.name, subjectCode: subject.code,
      totalSessions: 0, presentSessions: 0, absentSessions: 0, lateSessions: 0, excusedSessions: 0,
    };
    value.totalSessions += 1;
    if (status === "PRESENT") value.presentSessions += 1;
    else if (status === "LATE") { value.presentSessions += 1; value.lateSessions += 1; }
    else if (status === "EXCUSED") { value.presentSessions += 1; value.excusedSessions += 1; }
    else value.absentSessions += 1;
    subjects.set(subject.id, value);
  }
  const totalSessions = sessions.length;
  return {
    totalSessions,
    presentSessions: present,
    absentSessions: totalSessions - present,
    attendancePercentage: totalSessions ? Number(((present / totalSessions) * 100).toFixed(2)) : 0,
    subjects: [...subjects.values()].map((subject) => ({
      ...subject,
      attendancePercentage: subject.totalSessions
        ? Number(((subject.presentSessions / subject.totalSessions) * 100).toFixed(2))
        : 0,
    })),
  };
}

async function studentContext(user) {
  const [profile, enrollments] = await Promise.all([
    repository.findStudentProfile(user.id, user.institutionId),
    repository.findActiveEnrollments(user.id, user.institutionId),
  ]);
  if (!profile) throw new AppError("Student account is unavailable", 403);
  return {
    profile,
    enrollments,
    classIds: enrollments.map((enrollment) => enrollment.classId),
    enrolledAfter: enrollments.length ? new Date(Math.min(...enrollments.map((item) => item.enrolledAt.getTime()))) : null,
  };
}

function requireEnrollment(context) {
  if (!context.classIds.length) throw new AppError("No active class enrollment was found", 404);
}

function normalizeSlot(slot, nextOccurrence = undefined) {
  return {
    id: slot.id, weekday: slot.weekday, startTime: slot.startTime, endTime: slot.endTime, room: slot.room,
    subject: slot.classSubject.subject, teacher: slot.classSubject.teacher, schoolClass: slot.classSubject.schoolClass,
    ...(nextOccurrence ? { nextOccurrence } : {}),
  };
}

function nextOccurrence(slot, now = new Date()) {
  const candidate = new Date(now);
  const currentWeekday = candidate.getDay() || 7;
  candidate.setDate(candidate.getDate() + ((slot.weekday - currentWeekday + 7) % 7));
  const time = new Date(slot.startTime);
  candidate.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
  return candidate;
}

export async function getDashboard(user) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const [sessions, timetable, notifications] = await Promise.all([
    repository.findEligibleSessions(context),
    repository.findTimetableSlots(user.institutionId, context.classIds),
    repository.findNotifications({ institutionId: user.institutionId, recipientId: user.id, skip: 0, take: 5 }),
  ]);
  const summary = attendanceSummary(sessions);
  const upcoming = timetable
    .map((slot) => normalizeSlot(slot, nextOccurrence(slot)))
    .sort((a, b) => a.nextOccurrence - b.nextOccurrence)
    .slice(0, 5);
  return {
    profile: {
      id: context.profile.id, fullName: context.profile.fullName, email: context.profile.email,
      phone: context.profile.phone, studentNumber: context.profile.studentDetails?.studentNumber ?? null,
      isActive: context.profile.isActive,
    },
    institution: context.profile.institution,
    enrollment: context.enrollments[0],
    attendance: {
      totalSessions: summary.totalSessions, presentSessions: summary.presentSessions,
      absentSessions: summary.absentSessions, attendancePercentage: summary.attendancePercentage,
    },
    upcomingTimetable: upcoming,
    recentAttendance: sessions.slice(0, 5).map(toAttendance),
    latestNotifications: notifications,
  };
}

export async function getProfile(user) {
  const context = await studentContext(user);
  return {
    id: context.profile.id, fullName: context.profile.fullName, email: context.profile.email, phone: context.profile.phone,
    studentNumber: context.profile.studentDetails?.studentNumber ?? null, isActive: context.profile.isActive,
    institution: context.profile.institution,
    enrollments: context.enrollments,
  };
}

export async function editProfile(user, input) {
  const context = await studentContext(user);
  const profile = await repository.updateStudentProfile(context.profile.id, user.institutionId, input);
  return { id: profile.id, fullName: profile.fullName, email: profile.email, phone: profile.phone, isActive: profile.isActive };
}

export async function getAttendanceSummary(user) {
  const context = await studentContext(user);
  requireEnrollment(context);
  return attendanceSummary(await repository.findEligibleSessions(context));
}

export async function getAttendanceHistory(user, query) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const { page, limit, status, ...filters } = query;
  if (status) {
    const sessions = await repository.findEligibleSessions({ ...context, filters });
    const records = sessions.map(toAttendance).filter((item) => item.status === status);
    return {
      records: records.slice((page - 1) * limit, page * limit),
      pagination: pagination(page, limit, records.length),
    };
  }
  const [total, sessions] = await Promise.all([
    repository.countEligibleSessions({ ...context, filters }),
    repository.findEligibleSessions({ ...context, filters, skip: (page - 1) * limit, take: limit }),
  ]);
  const data = sessions.map(toAttendance).filter((item) => !status || item.status === status);
  return { records: data, pagination: pagination(page, limit, total) };
}

export async function getAttendanceCalendar(user, query) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const from = new Date(Date.UTC(query.year, query.month - 1, 1));
  const to = new Date(Date.UTC(query.year, query.month, 1));
  const sessions = await repository.findEligibleSessions({ ...context, filters: { from, to } });
  const dates = {};
  for (const item of sessions.map(toAttendance)) {
    (dates[item.date] ??= []).push(item);
  }
  return { year: query.year, month: query.month, dates };
}

export async function getAttendanceSubjects(user) {
  const summary = await getAttendanceSummary(user);
  return { subjects: summary.subjects };
}

export async function getTimetable(user) {
  const context = await studentContext(user);
  requireEnrollment(context);
  return { slots: (await repository.findTimetableSlots(user.institutionId, context.classIds)).map(normalizeSlot) };
}

export async function getTodayTimetable(user) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const weekday = new Date().getDay() || 7;
  return { weekday, slots: (await repository.findTimetableSlots(user.institutionId, context.classIds, weekday)).map(normalizeSlot) };
}

export async function getUpcomingTimetable(user) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const slots = await repository.findTimetableSlots(user.institutionId, context.classIds);
  return { slots: slots.map((slot) => normalizeSlot(slot, nextOccurrence(slot))).sort((a, b) => a.nextOccurrence - b.nextOccurrence) };
}

export async function getSubjects(user) {
  const context = await studentContext(user);
  requireEnrollment(context);
  return { subjects: await repository.findSubjects(user.institutionId, context.classIds) };
}

export async function getSubject(user, subjectId) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const subject = await repository.findSubjectForStudent(user.institutionId, context.classIds, subjectId);
  if (!subject) throw new AppError("Subject not found", 404);
  return subject;
}

export async function getStudyMaterials(user, query) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const { page, limit, ...filters } = query;
  const args = { institutionId: user.institutionId, classIds: context.classIds, ...filters };
  const [total, materials] = await Promise.all([
    repository.countStudyMaterials(args),
    repository.findStudyMaterials({ ...args, skip: (page - 1) * limit, take: limit }),
  ]);
  return { materials, pagination: pagination(page, limit, total) };
}

export async function getStudyMaterial(user, materialId) {
  const context = await studentContext(user);
  requireEnrollment(context);
  const material = await repository.findStudyMaterial(user.institutionId, context.classIds, materialId);
  if (!material) throw new AppError("Study material not found", 404);
  return material;
}

export async function getNotifications(user, query) {
  const { page, limit, unread } = query;
  const args = { institutionId: user.institutionId, recipientId: user.id, unread: unread === "true" };
  const [total, notifications] = await Promise.all([
    repository.countNotifications(args),
    repository.findNotifications({ ...args, skip: (page - 1) * limit, take: limit }),
  ]);
  return { notifications, pagination: pagination(page, limit, total) };
}

export async function getNotification(user, notificationId) {
  const notification = await repository.findNotification(user.institutionId, user.id, notificationId);
  if (!notification) throw new AppError("Notification not found", 404);
  return notification;
}

export async function readNotification(user, notificationId) {
  const result = await repository.markNotificationRead(user.institutionId, user.id, notificationId);
  if (!result.count) {
    const notification = await repository.findNotification(user.institutionId, user.id, notificationId);
    if (!notification) throw new AppError("Notification not found", 404);
  }
  return { markedRead: true };
}

export async function readAllNotifications(user) {
  const result = await repository.markAllNotificationsRead(user.institutionId, user.id);
  return { markedRead: result.count };
}

export async function getDevice(user) {
  const context = await studentContext(user);
  const devices = await repository.findStudentDevices(user.institutionId, context.profile.id);
  return { activeDevice: devices.find((item) => item.status === "ACTIVE") ?? null, pendingDevice: devices.find((item) => item.status === "PENDING") ?? null };
}

export async function registerDevice(user, input) {
  const context = await studentContext(user);
  const result = await repository.registerPendingDevice({ institutionId: user.institutionId, profileId: context.profile.id, ...input });
  if (result.kind === "active_exists") throw new AppError("An active device is already registered; request a replacement.", 409);
  if (result.kind === "pending_exists") throw new AppError("A device registration is already pending.", 409);
  if (result.kind === "identifier_in_use") throw new AppError("This device is already registered.", 409);
  return { id: result.device.id, status: result.device.status, registeredAt: result.device.registeredAt };
}

export async function requestDeviceReplacement(user, input) {
  const context = await studentContext(user);
  const result = await repository.createReplacementRequest({ institutionId: user.institutionId, profileId: context.profile.id, ...input });
  if (result.kind === "no_active_device") throw new AppError("No active device is registered.", 409);
  if (result.kind === "pending_exists") throw new AppError("A replacement request is already pending.", 409);
  if (result.kind === "identifier_in_use") throw new AppError("This device is already registered.", 409);
  return { id: result.request.id, status: result.request.status, createdAt: result.request.createdAt };
}
