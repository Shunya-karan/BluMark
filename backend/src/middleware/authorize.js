import AppError from "../utils/AppError.js";
export function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError("Authentication required", 401));
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    next();
  };
}
export default authorizeRoles;
