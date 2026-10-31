import AppError from "../utils/AppError.js";

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let e = err;
  if (err.code === "P2002") {
    e = new AppError("A record with these details already exists", 409);
  } else if (err.code === "P2025") {
    e = new AppError("Record not found", 404);
  }

  const statusCode = e.statusCode || err.status || err.statusCode || 500;

  // Print full error stack to the terminal for debugging
  console.error("==================== API ERROR ====================");
  console.error(`Request: ${req.method} ${req.path}`);
  console.error(`Status:  ${statusCode}`);
  console.error(`Code:    ${err.code || "N/A"}`);
  console.error("Details:");
  console.error(err.stack || err);
  console.error("===================================================");

  const body = {
    success: false,
    message: e instanceof AppError ? e.message : "Internal server error",
  };

  if (e.details) {
    body.details = e.details;
  }

  return res.status(statusCode).json(body);
};

export default errorHandler;
