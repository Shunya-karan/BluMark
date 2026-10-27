import { randomBytes, randomUUID, createHash } from "node:crypto";
import argon2 from "argon2";
import {
  changePassword as updatePassword,
  clearFailedLogin,
  consumeActivationToken,
  consumePasswordReset,
  countProfilesInInstitution,
  createActivationRequest,
  createAuthSession,
  createPasswordResetRequest,
  createProfileWithCredential,
  findActiveDepartmentById,
  findActiveInstitutionById,
  findCredentialByProfileId,
  findProfileByEmail,
  findLoginCredential,
  findActiveSessionContext,
  incrementFailedLogin,
  revokeSessionFamily,
  rotateRefreshToken,
} from "./auth.repository.js";
import { sanitizeProfile } from "./auth.mapper.js";
import { getAccessTokenTtl, signAccessToken, verifyAccessToken } from "../../config/jwt.js";
import { assertEmailConfigured, sendActivationEmail, sendPasswordResetEmail } from "../../config/email.js";
import { provisionUserSchema } from "./auth.validation.js";
import AppError from "../../utils/AppError.js";

const PASSWORD_OPTIONS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };
const DUMMY_HASH = await argon2.hash(randomBytes(32), PASSWORD_OPTIONS);
const ALLOWED_ROLES = new Set(["INSTITUTION_ADMIN", "TEACHER", "STUDENT"]);
const IDLE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_PROFILES_PER_INSTITUTION = Number(process.env.MAX_PROFILES_PER_INSTITUTION || 10000);
const MAX_PROVISION_BATCH = 100;

export const normalizeEmail = (email) => email.trim().toLowerCase();
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");

async function verifyPassword(hash, password) {
  if (!hash) {
    await argon2.verify(DUMMY_HASH, password).catch(() => false);
    return false;
  }
  return argon2.verify(hash, password).catch(() => false);
}

function ensurePasswordLength(password) {
  if (Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 128) {
    throw new AppError("Password must contain 12 to 128 UTF-8 bytes", 422);
  }
}

function authFailure() {
  return new AppError("Invalid email or password", 401);
}

function activeProfile(profile) {
  return Boolean(
    profile?.isActive &&
    profile.institution?.isActive &&
    profile.credential?.activatedAt &&
    (!profile.credential.lockedUntil || profile.credential.lockedUntil <= new Date()),
  );
}

function tokenResponse(accessToken, refreshToken, profile) {
  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: getAccessTokenTtl(),
    refreshExpiresIn: Math.floor(IDLE_SESSION_MS / 1000),
    profile: sanitizeProfile(profile),
  };
}

async function createSession(profile, metadata = {}) {
  const now = new Date();
  const familyId = randomUUID();
  const refreshToken = randomToken();
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_SESSION_MS);
  const expiresAt = new Date(Math.min(now.getTime() + IDLE_SESSION_MS, absoluteExpiresAt.getTime()));
  await createAuthSession({
    familyId,
    profileId: profile.id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
    absoluteExpiresAt,
    lastUsedAt: now,
    ipAddress: metadata.ipAddress?.slice(0, 64) || null,
    userAgent: metadata.userAgent?.slice(0, 512) || null,
  });
  const accessToken = await signAccessToken({ profileId: profile.id, sessionId: familyId, now });
  return tokenResponse(accessToken, refreshToken, profile);
}

export async function login({ email, password, ipAddress, userAgent }) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await findLoginCredential(normalizedEmail);
  const correctPassword = await verifyPassword(credential?.passwordHash, password);
  const now = new Date();

  if (!credential || !correctPassword || !activeProfile({
    ...credential.profile,
    credential,
  })) {
    if (credential && (!credential.lockedUntil || credential.lockedUntil <= now)) {
      const nextCount = (credential.failedLoginCount || 0) + 1;
      await incrementFailedLogin(
        credential.profileId,
        nextCount >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOCKOUT_MS) : null,
      ).catch(() => {});
    }
    throw authFailure();
  }

  await clearFailedLogin(credential.profileId);
  return createSession(credential.profile, { ipAddress, userAgent });
}

export async function resolveAuthenticatedContext(accessToken) {
  let claims;
  try {
    claims = await verifyAccessToken(accessToken);
  } catch {
    throw new AppError("Invalid or expired access token", 401);
  }

  const session = await findActiveSessionContext(claims.sid, new Date());
  if (!session || session.profileId !== claims.sub || !activeProfile(session.profile)) {
    throw new AppError("Invalid or expired access token", 401);
  }

  const user = sanitizeProfile(session.profile);
  return {
    authUser: { id: session.profileId },
    user,
    institutionId: user.institutionId,
    sessionId: claims.sid,
  };
}

export async function getCurrentUser(id) {
  const profile = await findCredentialByProfileId(id);
  if (!profile || !activeProfile({ ...profile.profile, credential: profile })) {
    throw new AppError("Account is inactive", 403);
  }
  return sanitizeProfile(profile.profile);
}

export async function refreshSession(refreshToken, metadata = {}) {
  if (typeof refreshToken !== "string" || !/^[A-Za-z0-9_-]{40,100}$/.test(refreshToken)) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const now = new Date();
  const nextToken = randomToken();
  const idleExpiresAt = new Date(now.getTime() + IDLE_SESSION_MS);
  const result = await rotateRefreshToken({
    tokenHash: hashToken(refreshToken),
    newTokenHash: hashToken(nextToken),
    now,
    idleExpiresAt,
    ipAddress: metadata.ipAddress?.slice(0, 64) || null,
    userAgent: metadata.userAgent?.slice(0, 512) || null,
  });

  if (result.kind !== "ok") {
    throw new AppError("Invalid or expired refresh token; sign in again", 401);
  }

  const accessToken = await signAccessToken({
    profileId: result.profile.id,
    sessionId: result.familyId,
    now,
  });
  return tokenResponse(accessToken, nextToken, result.profile);
}

export async function logout(sessionId) {
  if (!sessionId) throw new AppError("Authentication required", 401);
  await revokeSessionFamily(sessionId, "LOGOUT");
  return { revoked: true };
}

export async function changePassword(profileId, currentPassword, newPassword) {
  ensurePasswordLength(newPassword);
  const credential = await findCredentialByProfileId(profileId);
  if (!credential?.passwordHash || !(await verifyPassword(credential.passwordHash, currentPassword))) {
    throw new AppError("Current password is incorrect", 401);
  }
  if (await verifyPassword(credential.passwordHash, newPassword)) {
    throw new AppError("New password must differ from the current password", 422);
  }
  await updatePassword(profileId, await argon2.hash(newPassword, PASSWORD_OPTIONS), new Date());
  return { changed: true, sessionsRevoked: true };
}

async function deliverLink(send, email, rawToken, event) {
  try {
    await send(email, rawToken);
  } catch (error) {
    console.error({ event, code: error?.code || "MAIL_DELIVERY_FAILED" });
  }
}

export async function requestActivation(email) {
  assertEmailConfigured();
  const normalizedEmail = normalizeEmail(email);
  const rawToken = randomToken();
  const profile = await createActivationRequest(
    normalizedEmail,
    hashToken(rawToken),
    new Date(Date.now() + 30 * 60 * 1000),
  );
  if (profile) await deliverLink(sendActivationEmail, profile.email, rawToken, "activation_email_failed");
  return { message: "If an eligible account exists, activation instructions will be sent." };
}

export async function activateAccount(token, password) {
  ensurePasswordLength(password);
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    throw new AppError("Invalid or expired activation token", 400);
  }
  const result = await consumeActivationToken(
    hashToken(token),
    await argon2.hash(password, PASSWORD_OPTIONS),
    new Date(),
  );
  if (result.kind !== "ok") throw new AppError("Invalid or expired activation token", 400);
  return { activated: true };
}

export async function forgotPassword(email) {
  assertEmailConfigured();
  const rawToken = randomToken();
  const credential = await createPasswordResetRequest(
    normalizeEmail(email),
    hashToken(rawToken),
    new Date(Date.now() + 30 * 60 * 1000),
  );
  if (credential) {
    await deliverLink(sendPasswordResetEmail, credential.email, rawToken, "password_reset_email_failed");
  }
  return { message: "If an account exists for that email, password reset instructions will be sent." };
}

export async function resetPassword(token, newPassword) {
  ensurePasswordLength(newPassword);
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    throw new AppError("Invalid or expired password reset token", 400);
  }
  const result = await consumePasswordReset(
    hashToken(token),
    await argon2.hash(newPassword, PASSWORD_OPTIONS),
    new Date(),
  );
  if (result.kind !== "ok") throw new AppError("Invalid or expired password reset token", 400);
  return { reset: true, sessionsRevoked: true };
}

export async function provisionUsers(admin, records) {
  if (admin.role !== "INSTITUTION_ADMIN") {
    throw new AppError("You do not have permission to perform this action", 403);
  }
  if (!Array.isArray(records) || records.length < 1 || records.length > MAX_PROVISION_BATCH) {
    throw new AppError(`A provisioning batch must contain 1 to ${MAX_PROVISION_BATCH} records`, 422);
  }

  const institutionId = admin.institutionId;
  const institution = await findActiveInstitutionById(institutionId);
  if (!institution) throw new AppError("Institution not found or inactive", 404);

  const parsed = records.map((record) => provisionUserSchema.safeParse(record));
  const emailCounts = new Map();
  for (const item of parsed) {
    if (item.success) {
      const key = normalizeEmail(item.data.email);
      emailCounts.set(key, (emailCounts.get(key) || 0) + 1);
    }
  }

  let totalProfiles = await countProfilesInInstitution(institutionId);
  const results = [];
  for (let index = 0; index < records.length; index += 1) {
    const item = parsed[index];
    if (!item.success) {
      results.push({ index, status: "failed", code: "VALIDATION_ERROR", message: "Record validation failed" });
      continue;
    }
    const input = item.data;
    const email = normalizeEmail(input.email);
    if (emailCounts.get(email) > 1) {
      results.push({ index, status: "failed", code: "DUPLICATE_IN_BATCH", message: "Email appears more than once in this batch" });
      continue;
    }
    if (totalProfiles >= MAX_PROFILES_PER_INSTITUTION) {
      results.push({ index, status: "failed", code: "INSTITUTION_LIMIT", message: "Institution account limit reached" });
      continue;
    }
    if (await findProfileByEmail(email) ||
        await findLoginCredential(email)) {
      results.push({ index, status: "failed", code: "DUPLICATE_EMAIL", message: "Email is already in use" });
      continue;
    }
    if (input.role === "TEACHER" && input.departmentId &&
        !(await findActiveDepartmentById(input.departmentId, institutionId))) {
      results.push({ index, status: "failed", code: "INVALID_DEPARTMENT", message: "Department does not belong to this institution" });
      continue;
    }

    try {
      const profile = await createProfileWithCredential({
        profileId: randomUUID(),
        institutionId,
        actorId: admin.id,
        input,
        emailNormalized: email,
      });
      totalProfiles += 1;
      results.push({
        index,
        status: "created",
        profileId: profile.id,
        email,
        role: profile.role,
        activationRequired: true,
      });
    } catch (error) {
      const duplicate = error?.code === "P2002";
      results.push({
        index,
        status: "failed",
        code: duplicate ? "DUPLICATE" : "DATABASE_ERROR",
        message: duplicate ? "Email or identifier is already in use" : "Account could not be created",
      });
    }
  }

  const created = results.filter((result) => result.status === "created").length;
  return { created, failed: results.length - created, results };
}

export async function provisionUser(admin, input) {
  const result = await provisionUsers(admin, [input]);
  const item = result.results[0];
  if (item.status !== "created") throw new AppError(item.message, item.code === "VALIDATION_ERROR" ? 422 : 409);
  return item;
}

export default {
  login, resolveAuthenticatedContext, getCurrentUser, refreshSession, logout,
  changePassword, requestActivation, activateAccount, forgotPassword, resetPassword,
  provisionUser, provisionUsers,
};

