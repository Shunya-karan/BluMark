class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
export default AppError;
