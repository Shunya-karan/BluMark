import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/apiResponse.js";
import * as service from "./student.service.js";

export const dashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboard(req.user);
  return sendResponse(res, 200, "Student dashboard retrieved successfully", data);
});

export const profile = catchAsync(async (req, res) => {
  const data = await service.getProfile(req.user);
  return sendResponse(res, 200, "Student profile retrieved successfully", data);
});

export const updateProfile = catchAsync(async (req, res) => {
  const data = await service.editProfile(req.user, req.body);
  return sendResponse(res, 200, "Student profile updated successfully", data);
});

export const attendanceSummary = catchAsync(async (req, res) => {
  const data = await service.getAttendanceSummary(req.user);
  return sendResponse(res, 200, "Attendance summary retrieved successfully", data);
});

export const attendanceHistory = catchAsync(async (req, res) => {
  const data = await service.getAttendanceHistory(req.user, req.query);
  return sendResponse(res, 200, "Attendance history retrieved successfully", data);
});

export const attendanceCalendar = catchAsync(async (req, res) => {
  const data = await service.getAttendanceCalendar(req.user, req.query);
  return sendResponse(res, 200, "Attendance calendar retrieved successfully", data);
});

export const attendanceSubjects = catchAsync(async (req, res) => {
  const data = await service.getAttendanceSubjects(req.user);
  return sendResponse(res, 200, "Subject attendance retrieved successfully", data);
});

export const timetable = catchAsync(async (req, res) => {
  const data = await service.getTimetable(req.user);
  return sendResponse(res, 200, "Timetable retrieved successfully", data);
});

export const timetableToday = catchAsync(async (req, res) => {
  const data = await service.getTodayTimetable(req.user);
  return sendResponse(res, 200, "Today's timetable retrieved successfully", data);
});

export const timetableUpcoming = catchAsync(async (req, res) => {
  const data = await service.getUpcomingTimetable(req.user);
  return sendResponse(res, 200, "Upcoming timetable retrieved successfully", data);
});

export const subjects = catchAsync(async (req, res) => {
  const data = await service.getSubjects(req.user);
  return sendResponse(res, 200, "Student subjects retrieved successfully", data);
});

export const subject = catchAsync(async (req, res) => {
  const data = await service.getSubject(req.user, req.params.subjectId);
  return sendResponse(res, 200, "Subject retrieved successfully", data);
});

export const studyMaterials = catchAsync(async (req, res) => {
  const data = await service.getStudyMaterials(req.user, req.query);
  return sendResponse(res, 200, "Study materials retrieved successfully", data);
});

export const studyMaterial = catchAsync(async (req, res) => {
  const data = await service.getStudyMaterial(req.user, req.params.materialId);
  return sendResponse(res, 200, "Study material retrieved successfully", data);
});

export const notifications = catchAsync(async (req, res) => {
  const data = await service.getNotifications(req.user, req.query);
  return sendResponse(res, 200, "Notifications retrieved successfully", data);
});

export const notification = catchAsync(async (req, res) => {
  const data = await service.getNotification(req.user, req.params.notificationId);
  return sendResponse(res, 200, "Notification retrieved successfully", data);
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const data = await service.readNotification(req.user, req.params.notificationId);
  return sendResponse(res, 200, "Notification marked as read", data);
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  const data = await service.readAllNotifications(req.user);
  return sendResponse(res, 200, "Notifications marked as read", data);
});

export const device = catchAsync(async (req, res) => {
  const data = await service.getDevice(req.user);
  return sendResponse(res, 200, "Device information retrieved successfully", data);
});

export const registerDevice = catchAsync(async (req, res) => {
  const data = await service.registerDevice(req.user, req.body);
  return sendResponse(res, 201, "Device registration requested successfully", data);
});

export const requestReplacement = catchAsync(async (req, res) => {
  const data = await service.requestDeviceReplacement(req.user, req.body);
  return sendResponse(res, 200, "Device replacement requested successfully", data);
});

export const academicDetails = catchAsync(async (req, res) => {
  const data = await service.getProfile(req.user);
  return sendResponse(res, 200, "Academic details retrieved successfully", data);
});

export const enrollment = catchAsync(async (req, res) => {
  const profileData = await service.getProfile(req.user);
  return sendResponse(res, 200, "Enrollment retrieved successfully", { enrollments: profileData.enrollments });
});
