
import catchAsync from "../../../utils/catchAsync.js";
import sendResponse from "../../../utils/apiResponse.js";
import * as service from "./notification.service.js";

export const sendNotification = catchAsync(async (req, res) => {
  const data = await service.sendNotification(req.user, req.body);

  return sendResponse(
    res,
    201,
    "Notification sent successfully",
    data,
  );
});

export const listNotifications = catchAsync(async (req, res) => {
  const data = await service.listNotifications(req.user, req.query);

  return sendResponse(
    res,
    200,
    "Notifications retrieved successfully",
    data,
  );
});

export const getNotification = catchAsync(async (req, res) => {
  const data = await service.getNotification(
    req.user,
    req.params.notificationId,
  );

  return sendResponse(
    res,
    200,
    "Notification details retrieved successfully",
    data,
  );
});

export const getStats = catchAsync(async (req, res) => {
  const data = await service.getStats(req.user);

  return sendResponse(
    res,
    200,
    "Notification statistics retrieved successfully",
    data,
  );
});
