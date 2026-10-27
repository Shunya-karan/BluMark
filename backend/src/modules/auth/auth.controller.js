import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/apiResponse.js";
import * as service from "./auth.service.js";
import {
  clearAuthCookies,
  readCookie,
  setAuthCookies,
  useCookieTransport,
} from "./auth.cookies.js";

function withoutTokens(session) {
  const { accessToken, refreshToken, ...safe } = session;
  return safe;
}

export const login = catchAsync(async (req, res) => {
  const session = await service.login({
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  if (useCookieTransport(req)) {
    setAuthCookies(res, session);
    return sendResponse(res, 200, "Signed in", withoutTokens(session));
  }
  return sendResponse(res, 200, "Signed in", session);
});

export const me = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Current user", await service.getCurrentUser(req.user.id)),
);

export const refresh = catchAsync(async (req, res) => {
  const session = await service.refreshSession(
    req.body?.refreshToken || readCookie(req, "blumark_refresh"),
    { ipAddress: req.ip, userAgent: req.get("user-agent") },
  );
  if (useCookieTransport(req)) {
    setAuthCookies(res, session);
    return sendResponse(res, 200, "Session refreshed", withoutTokens(session));
  }
  return sendResponse(res, 200, "Session refreshed", session);
});

export const logout = catchAsync(async (req, res) => {
  const result = await service.logout(req.sessionId);
  clearAuthCookies(res);
  return sendResponse(res, 200, "Signed out", result);
});

export const provision = catchAsync(async (req, res) =>
  sendResponse(res, 201, "Account created; activation is required", await service.provisionUser(req.user, req.body)),
);

export const provisionBulk = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Provisioning batch processed", await service.provisionUsers(req.user, req.body.users)),
);

export const changePassword = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Password changed; sign in again", await service.changePassword(
    req.user.id, req.body.currentPassword, req.body.newPassword,
  )),
);

export const requestActivation = catchAsync(async (req, res) =>
  sendResponse(res, 200, "If an eligible account exists, activation instructions will be sent", await service.requestActivation(req.body.email)),
);

export const activate = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Account activated", await service.activateAccount(req.body.token, req.body.password)),
);

export const forgotPassword = catchAsync(async (req, res) =>
  sendResponse(res, 200, "If an account exists for that email, password reset instructions will be sent", await service.forgotPassword(req.body.email)),
);

export const resetPassword = catchAsync(async (req, res) =>
  sendResponse(res, 200, "Password reset; sign in again", await service.resetPassword(req.body.token, req.body.newPassword)),
);

