import { randomUUID } from "node:crypto";
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
import { assertEmailConfigured, sendActivationEmail, sendPasswordResetEmail, sendProvisionedUserCredentials } from "../../config/email.js";
import { provisionUserSchema } from "./auth.validation.js";
import AppError from "../../utils/AppError.js";

// Import reusable auth utilities
import { hashPassword, verifyPassword, validatePasswordLength, generateTemporaryPassword } from "../../utils/auth/password.util.js";
import { generateSecureToken, hashToken, validateTokenFormat } from "../../utils/auth/token.util.js";

const IDLE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_PROFILES_PER_INSTITUTION = Number(process.env.MAX_PROFILES_PER_INSTITUTION || 10000);
const MAX_PROVISION_BATCH = 100;

export const normalizeEmail = (email) => email.trim().toLowerCase();

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
  const refreshToken = generateSecureToken();
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
  validateTokenFormat(refreshToken);

  const now = new Date();
  const nextToken = generateSecureToken();
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

  // Prevent refresh token from bypassing forced password change
  if (result.profile.credential?.mustChangePassword) {
    throw new AppError("You must change your temporary password before continuing", 403);
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
  validatePasswordLength(newPassword);

  const credential = await findCredentialByProfileId(profileId);
  const isForcedChange = credential?.mustChangePassword;

  // Verify current password only if it is NOT a forced first-login change.
  // For forced change, they used their temporary password to login to this session.
  if (!isForcedChange) {
    if (!credential?.passwordHash || !(await verifyPassword(credential.passwordHash, currentPassword))) {
      throw new AppError("Current password is incorrect", 401);
    }
  }

  if (await verifyPassword(credential.passwordHash, newPassword)) {
    throw new AppError("New password must differ from the current password", 422);
  }

  await updatePassword(profileId, await hashPassword(newPassword), new Date());
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
  const rawToken = generateSecureToken();
  const profile = await createActivationRequest(
    normalizedEmail,
    hashToken(rawToken),
    new Date(Date.now() + 30 * 60 * 1000),
  );
  if (profile) await deliverLink(sendActivationEmail, profile.email, rawToken, "activation_email_failed");
  return { message: "If an eligible account exists, activation instructions will be sent." };
}

export async function activateAccount(token, password) {
  validatePasswordLength(password);
  validateTokenFormat(token);

  const result = await consumeActivationToken(
    hashToken(token),
    await hashPassword(password),
    new Date(),
  );
  if (result.kind !== "ok") throw new AppError("Invalid or expired activation token", 400);
  return { activated: true };
}

export async function forgotPassword(email) {
  assertEmailConfigured();
  const rawToken = generateSecureToken();
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
  validatePasswordLength(newPassword);
  validateTokenFormat(token);

  const result = await consumePasswordReset(
    hashToken(token),
    await hashPassword(newPassword),
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
  const successfulCreations = []; // To hold valid provision objects to dispatch emails

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
    if (await findProfileByEmail(email) || await findLoginCredential(email)) {
      results.push({ index, status: "failed", code: "DUPLICATE_EMAIL", message: "Email is already in use" });
      continue;
    }
    if (input.role === "TEACHER" && input.departmentId && !(await findActiveDepartmentById(input.departmentId, institutionId))) {
      results.push({ index, status: "failed", code: "INVALID_DEPARTMENT", message: "Department does not belong to this institution" });
      continue;
    }

    try {
      const tempPassword = generateTemporaryPassword();
      const hashedTempPassword = await hashPassword(tempPassword);

      const profile = await createProfileWithCredential({
        profileId: randomUUID(),
        institutionId,
        actorId: admin.id,
        input,
        emailNormalized: email,
        passwordHash: hashedTempPassword,
        activatedAt: new Date() // Mark the account as active and ready to log in immediately
      });

      totalProfiles += 1;

      const successInfo = {
        index,
        status: "created",
        profileId: profile.id,
        email,
        role: profile.role,
        mustChangePassword: true,
        emailDelivery: "pending"
      };

      results.push(successInfo);

      // Store creation for post-transaction email delivery
      successfulCreations.push({
        fullName: profile.fullName,
        email,
        temporaryPassword: tempPassword,
        resultRef: successInfo
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

  // Transaction is complete. Now send emails safely.
  for (const creation of successfulCreations) {
    try {
      await sendProvisionedUserCredentials(creation.email, {
        fullName: creation.fullName,
        temporaryPassword: creation.temporaryPassword
      });
      creation.resultRef.emailDelivery = "sent";
    } catch (error) {
      console.error({ event: "provision_email_failed", email: creation.email, code: error?.code || "MAIL_DELIVERY_FAILED" });
      creation.resultRef.emailDelivery = "failed";
    }
  }

  const created = successfulCreations.length;
  return { created, failed: results.length - created, results };
}

export async function provisionUser(admin, input) {
  const result = await provisionUsers(admin, [input]);
  const item = result.results[0];
  if (item.status !== "created") throw new AppError(item.message, item.code === "VALIDATION_ERROR" ? 422 : 409);

  // Return single object response format
  return {
    status: item.status,
    profileId: item.profileId,
    email: item.email,
    role: item.role,
    mustChangePassword: item.mustChangePassword,
    emailDelivery: item.emailDelivery
  };
}

export async function resendCredentials(admin, profileId) {
  if (admin.role !== "INSTITUTION_ADMIN") {
    throw new AppError("You do not have permission to perform this action", 403);
  }

  const credential = await findCredentialByProfileId(profileId);
  if (!credential || credential.profile.institutionId !== admin.institutionId) {
    throw new AppError("Account not found", 404);
  }

  if (!credential.mustChangePassword) {
    throw new AppError("Account has already been fully activated by the user and no longer uses a temporary password.", 400);
  }

  const tempPassword = generateTemporaryPassword();
  const hashedTempPassword = await hashPassword(tempPassword);

  // Re-hash and store new password, and revoke any stray sessions
  await updatePassword(profileId, hashedTempPassword, null); // Keep passwordChangedAt null as they still must change it

  try {
    await sendProvisionedUserCredentials(credential.profile.email, {
      fullName: credential.profile.fullName,
      temporaryPassword: tempPassword
    });
    return { status: "resent", emailDelivery: "sent" };
  } catch (error) {
    console.error({ event: "resend_provision_email_failed", email: credential.profile.email, code: error?.code || "MAIL_DELIVERY_FAILED" });
    return { status: "resent", emailDelivery: "failed" };
  }
}

export default {
  login, resolveAuthenticatedContext, getCurrentUser, refreshSession, logout,
  changePassword, requestActivation, activateAccount, forgotPassword, resetPassword,
  provisionUser, provisionUsers, resendCredentials
};
