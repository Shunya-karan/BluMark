import { resolveAuthenticatedContext } from "../modules/auth/auth.service.js";
import { readCookie } from "../modules/auth/auth.cookies.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

const authenticate = catchAsync(async (req, _res, next) => {
  const match = /^Bearer\s+([^\s]+)$/i.exec(req.get("authorization") ?? "");
  const token = match?.[1] || readCookie(req, "blumark_access");
  if (!token) throw new AppError("Authentication required", 401);

  const context = await resolveAuthenticatedContext(token);
  req.authUser = context.authUser;
  req.accessToken = token;
  req.sessionId = context.sessionId;
  req.user = context.user;
  req.institutionId = context.institutionId;
  next();
});

export default authenticate;

