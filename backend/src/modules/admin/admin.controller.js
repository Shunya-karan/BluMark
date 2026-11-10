
import * as service from "./admin.service.js";
import sendResponse from "../../utils/apiResponse.js";
import catchAsync from "../../utils/catchAsync.js";

export const dashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboard(req.user);

  return sendResponse(
    res,
    200,
    "Admin dashboard retrieved successfully",
    data,
  );
});

export const dashboardSummary = catchAsync(async (req, res) => {
  const data = await service.getDashboardSummary(req.user);

  return sendResponse(
    res,
    200,
    "Dashboard summary retrieved successfully",
    data,
  );
});

export const recentActivity = catchAsync(async (req, res) => {
  const data = await service.getRecentActivity(
    req.user,
    req.query.limit,
  );

  return sendResponse(
    res,
    200,
    "Recent institution activity retrieved successfully",
    data,
  );
});

export const getProfile = catchAsync(async (req, res) => {
  const data = await service.getAdminProfile(req.user);

  return sendResponse(
    res,
    200,
    "Admin profile retrieved successfully",
    data,
  );
});

export const updateProfile = catchAsync(async (req, res) => {
  const data = await service.updateAdminProfile(
    req.user,
    req.body,
  );

  return sendResponse(
    res,
    200,
    "Admin profile updated successfully",
    data,
  );
});
