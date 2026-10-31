import AppError from "../utils/AppError.js";
const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const r = schema.safeParse(req[source]);
    if (!r.success)
      return next(
        new AppError(
          "Request validation failed",
          400,
          r.error.issues.map(({ path, message }) => ({
            field: path.join("."),
            message,
          })),
        ),
      );
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: r.data,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      req[source] = r.data;
    }
    next();
  };
export default validate;
