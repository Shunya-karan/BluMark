import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/apiResponse.js";
import * as service from "./teacher.service.js";

export const dashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboard(req.user);
  return sendResponse(res, 200, "Teacher dashboard retrieved successfully", data);
});

export const summary = catchAsync(async (req, res) => {
  const data = await service.getSummary(req.user);
  return sendResponse(res, 200, "Teacher dashboard summary retrieved successfully", data);
});

export const todaySchedule = catchAsync(async (req, res) => {
  const data = await service.getTodaySchedule(req.user);
  return sendResponse(res, 200, "Today's teaching schedule retrieved successfully", data);
});

export const attendanceSummary = catchAsync(async (req, res) => {
  const data = await service.getAttendanceSummary(req.user);
  return sendResponse(res, 200, "Teacher attendance summary retrieved successfully", data);
});

export const recentActivity = catchAsync(async (req, res) => {
  const data = await service.getRecentActivity(req.user);
  return sendResponse(res, 200, "Teacher recent activity retrieved successfully", data);
});

export const profile = catchAsync(async (req, res) => {
  const data = await service.getProfile(req.user);
  return sendResponse(res, 200, "Teacher profile retrieved successfully", data);
});

export const updateProfile = catchAsync(async (req, res) => {
  const data = await service.editProfile(req.user, req.body);
  return sendResponse(res, 200, "Teacher profile updated successfully", data);
});

export const department = catchAsync(async (req, res) => {
  const data = await service.getDepartment(req.user);
  return sendResponse(res, 200, "Teacher department retrieved successfully", data);
});

export const subjects = catchAsync(async (req, res) => {
  const data = await service.getSubjects(req.user);
  return sendResponse(res, 200, "Teacher assigned subjects retrieved successfully", data);
});
