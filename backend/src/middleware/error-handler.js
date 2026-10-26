
import AppError from "../utils/AppError.js";

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  // Handle Prisma unique constraint violations.
  if (err.code === "P2002") {
    error = new AppError(
      "A record with these details already exists",
      409
    );
  }

  // Handle Prisma record-not-found errors.
  else if (err.code === "P2025") {
    error = new AppError("Record not found", 404);
  }

  const statusCode = error.statusCode || 500;

  // Log the full error for server-side debugging.
  console.error({
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  const response = {
    success: false,
    message:
      error instanceof AppError
        ? error.message
        : "Internal server error",
  };

  // Expose stack traces only during development.
  if (
    process.env.NODE_ENV === "development" &&
    !(error instanceof AppError)
  ) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
