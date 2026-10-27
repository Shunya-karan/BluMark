import { resolveAuthenticatedContext } from "../modules/auth/auth.service.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

const authenticate = catchAsync(async (req, _res, next) => {
  const match = /^Bearer\s+([^\s]+)$/i.exec(req.get("authorization") ?? "");
  if (!match) throw new AppError("Authentication required", 401);

  const context = await resolveAuthenticatedContext(match[1]);
  req.authUser = context.authUser;
  req.accessToken = match[1];
  req.user = context.user;
  req.institutionId = context.institutionId;
  next();
});

export default authenticate;
