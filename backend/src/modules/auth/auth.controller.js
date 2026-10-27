import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/apiResponse.js";
import * as service from "./auth.service.js";

export const login = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Signed in", await service.login(req.body)),
);
export const me = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Current user",
    await service.getCurrentUser(req.user.id),
  ),
);
export const refresh = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Session refreshed",
    await service.refreshSession(req.body.refreshToken),
  ),
);
export const logout = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Signed out", await service.logout(req.accessToken)),
);
export const provision = catchAsync(async (req, res) =>
  sendResponse(
    res,
    201,
    "Invitation sent",
    await service.provisionUser(req.user, req.body),
  ),
);
export const changePassword = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Password changed",
    await service.changePassword(
      req.user.id,
      req.user.email,
      req.body.currentPassword,
      req.body.newPassword,
    ),
  ),
);
export const forgotPassword = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "If an account exists for that email, password reset instructions will be sent.",
    await service.forgotPassword(req.body.email),
  ),
);
export const resetPassword = catchAsync(async (req, res) =>
  sendResponse(
    res,
    200,
    "Password reset",
    await service.resetPassword(req.body.tokenHash, req.body.newPassword),
  ),
);
