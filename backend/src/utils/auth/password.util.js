import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import AppError from "../AppError.js";

const PASSWORD_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

// Compute dummy hash once on startup
const DUMMY_HASH = await argon2.hash(randomBytes(32), PASSWORD_OPTIONS);

export function validatePasswordLength(password) {
  if (!password || Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 128) {
    throw new AppError("Password must contain 12 to 128 UTF-8 bytes", 422);
  }
}

export async function hashPassword(password) {
  return argon2.hash(password, PASSWORD_OPTIONS);
}

export async function verifyPassword(hash, password) {
  if (!hash) {
    // Perform dummy verify to prevent timing attacks when the user doesn't exist
    await argon2.verify(DUMMY_HASH, password || "").catch(() => false);
    return false;
  }
  return argon2.verify(hash, password).catch(() => false);
}

export function generateTemporaryPassword() {
  if (!process.env.DEFAULT_TEMPORARY_PASSWORD) {
    throw new Error("Missing DEFAULT_TEMPORARY_PASSWORD in environment configuration.");
  }
  return process.env.DEFAULT_TEMPORARY_PASSWORD;
}
