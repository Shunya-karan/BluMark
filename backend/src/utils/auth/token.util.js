import { randomBytes, createHash } from "node:crypto";
import AppError from "../AppError.js";

export function generateSecureToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function validateTokenFormat(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    throw new AppError("Invalid or expired token format", 400);
  }
}
