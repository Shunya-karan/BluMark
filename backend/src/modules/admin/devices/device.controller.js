
import catchAsync from "../../../utils/catchAsync.js";
import sendResponse from "../../../utils/apiResponse.js";
import * as service from "./device.service.js";

export const listDevices = catchAsync(async (req, res) => {
  const data = await service.listDevices(req.user, req.query);
  return sendResponse(res, 200, "Devices retrieved successfully", data);
});

export const getDevice = catchAsync(async (req, res) => {
  const data = await service.getDevice(req.user, req.params.deviceId);
  return sendResponse(res, 200, "Device retrieved successfully", data);
});

export const approveDevice = catchAsync(async (req, res) => {
  const data = await service.approveDevice(req.user, req.params.deviceId);
  return sendResponse(res, 200, "Device approved successfully", data);
});

export const rejectDevice = catchAsync(async (req, res) => {
  const data = await service.rejectDevice(
    req.user,
    req.params.deviceId,
    req.body.reason,
  );
  return sendResponse(res, 200, "Device rejected successfully", data);
});

export const revokeDevice = catchAsync(async (req, res) => {
  const data = await service.revokeDevice(
    req.user,
    req.params.deviceId,
    req.body.reason,
  );
  return sendResponse(res, 200, "Device revoked successfully", data);
});

export const listReplacementRequests = catchAsync(async (req, res) => {
  const data = await service.listReplacementRequests(req.user, req.query);
  return sendResponse(res, 200, "Replacement requests retrieved successfully", data);
});

export const getReplacementRequest = catchAsync(async (req, res) => {
  const data = await service.getReplacementRequest(
    req.user,
    req.params.requestId,
  );
  return sendResponse(res, 200, "Replacement request retrieved successfully", data);
});

export const approveReplacement = catchAsync(async (req, res) => {
  const data = await service.approveReplacement(
    req.user,
    req.params.requestId,
  );
  return sendResponse(res, 200, "Device replacement approved successfully", data);
});

export const rejectReplacement = catchAsync(async (req, res) => {
  const data = await service.rejectReplacement(
    req.user,
    req.params.requestId,
    req.body.reason,
  );
  return sendResponse(res, 200, "Device replacement rejected successfully", data);
});