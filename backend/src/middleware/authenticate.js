
import supabase from "../config/supabase.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

const authenticate = catchAsync(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Authentication token required", 401);
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new AppError("Authentication token required", 401);
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError("Invalid or expired authentication token", 401);
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
  };

  next();
});

export default authenticate;
