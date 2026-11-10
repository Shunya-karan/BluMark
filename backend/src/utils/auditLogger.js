
import prisma from "../config/prisma.js";

export const AUDIT_ACTIONS = Object.freeze({
  ADMIN_PROFILE_UPDATED: "ADMIN_PROFILE_UPDATED",
  USER_PROVISIONED: "USER_PROVISIONED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGOUT: "LOGOUT",

  DEPARTMENT_CREATED: "DEPARTMENT_CREATED",
  DEPARTMENT_UPDATED: "DEPARTMENT_UPDATED",
  CLASS_CREATED: "CLASS_CREATED",
  CLASS_UPDATED: "CLASS_UPDATED",
  SUBJECT_CREATED: "SUBJECT_CREATED",
  SUBJECT_UPDATED: "SUBJECT_UPDATED",
  TEACHER_ASSIGNED: "TEACHER_ASSIGNED",

  ATTENDANCE_SESSION_CREATED: "ATTENDANCE_SESSION_CREATED",
  ATTENDANCE_SESSION_ENDED: "ATTENDANCE_SESSION_ENDED",
  ATTENDANCE_MARKED: "ATTENDANCE_MARKED",
  ATTENDANCE_CORRECTED: "ATTENDANCE_CORRECTED",

  DEVICE_REGISTERED: "DEVICE_REGISTERED",
  DEVICE_REPLACEMENT_APPROVED: "DEVICE_REPLACEMENT_APPROVED",
  DEVICE_REPLACEMENT_REJECTED: "DEVICE_REPLACEMENT_REJECTED",

  MATERIAL_UPLOADED: "MATERIAL_UPLOADED",
  MATERIAL_UPDATED: "MATERIAL_UPDATED",
  MATERIAL_DELETED: "MATERIAL_DELETED",
});

const BLOCKED_KEYS = /password|secret|token|authorization|cookie|credential|privatekey|apikey|bletokenseed|storagekey|signedurl|presignedurl/i;

function sanitize(value, depth = 0) {
  if (depth > 5) return "[TRUNCATED]";

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) =>
      sanitize(item, depth + 1)
    );
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !BLOCKED_KEYS.test(key))
        .slice(0, 50)
        .map(([key, item]) => [
          key,
          sanitize(item, depth + 1),
        ])
    );
  }

  if (typeof value === "string") {
    return value.slice(0, 1000);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return String(value).slice(0, 1000);
}

/**
 * Writes an audit entry.
 *
 * Pass tx when already inside prisma.$transaction().
 * Without tx, uses the normal Prisma client.
 *
 * Never accept actorId or institutionId directly
 * from an untrusted request body.
 */
export async function createAuditLog({
  institutionId,
  actorId,
  action,
  entityType,
  entityId = null,
  details = {},
  tx = prisma,
}) {
  if (!institutionId || !actorId || !action || !entityType) {
    throw new Error("Missing required audit log fields");
  }

  return tx.auditLog.create({
    data: {
      institutionId,
      actorId,
      action,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      details: sanitize(details),
    },
    select: {
      id: true,
      createdAt: true,
    },
  });
}
