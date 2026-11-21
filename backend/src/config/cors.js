import cors from "cors";
import AppError from "../utils/AppError.js";
import { getFrontendOrigins } from "./frontend.js";

function isLocalDevelopmentOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      (url.port === "" || /^\d+$/.test(url.port))
    );
  } catch {
    return false;
  }
}

function isSameBackendOrigin(origin, req) {
  const host = req.get("host");
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || req.protocol;
  if (!host || !["http", "https"].includes(protocol)) return false;

  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

export function createCorsMiddleware() {
  const allowedOrigins = process.env.FRONTEND_URL ? getFrontendOrigins() : [];

  return (req, res, next) =>
    cors({
      credentials: true,
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          isLocalDevelopmentOrigin(origin) ||
          isSameBackendOrigin(origin, req)
        ) {
          return callback(null, true);
        }
        return callback(new AppError("Origin is not allowed by CORS", 403));
      },
    })(req, res, next);
}
