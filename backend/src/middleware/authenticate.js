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

  const mustChangePassword = context.user.credential?.mustChangePassword;
  if (mustChangePassword) {
    const safePath = req.originalUrl.split("?")[0];
    const isAllowed =
      safePath.endsWith("/auth/logout") ||
      safePath.endsWith("/auth/change-password") ||
      safePath.endsWith("/auth/me");

    if (!isAllowed) {
      throw new AppError("You must change your temporary password before continuing", 403);
    }
  }

  next();
});

export default authenticate;

