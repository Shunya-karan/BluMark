import prisma from "../../config/prisma.js";

const profileInclude = {
  institution: { select: { id: true, name: true, code: true, type: true, isActive: true } },
  studentDetails: { select: { studentNumber: true } },
  teacherDetails: {
    select: { employeeId: true, department: { select: { id: true, name: true, code: true } } },
  },
};

export function findProfileById(id) {
  return prisma.profile.findUnique({ where: { id }, include: profileInclude });
}

export function findLoginCredential(emailNormalized) {
  return prisma.userCredential.findUnique({
    where: { emailNormalized },
    include: { profile: { include: profileInclude } },
  });
}

export function findCredentialByProfileId(profileId) {
  return prisma.userCredential.findUnique({
    where: { profileId },
    include: { profile: { include: profileInclude } },
  });
}

export function findActiveInstitutionById(id) {
  return prisma.institution.findFirst({
    where: { id, isActive: true },
    select: { id: true, name: true, code: true, type: true },
  });
}

export function findActiveDepartmentById(id, institutionId) {
  return prisma.department.findFirst({
    where: { id, institutionId, isActive: true },
    select: { id: true, name: true, code: true },
  });
}

export function findProfileByInstitutionAndEmail(institutionId, email) {
  return prisma.profile.findFirst({
    where: { institutionId, email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
}

export function findProfileByEmail(email) {
  return prisma.profile.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
}

export function countProfilesInInstitution(institutionId) {
  return prisma.profile.count({ where: { institutionId } });
}

export function createProfileWithCredential({ profileId, institutionId, actorId, input, emailNormalized, passwordHash, activatedAt }) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: {
        id: profileId, institutionId, fullName: input.fullName, email: emailNormalized,
        phone: input.phone || null, role: input.role, isActive: true,
      },
    });
    if (input.role === "TEACHER") {
      await tx.teacherDetail.create({
        data: { profileId, institutionId, departmentId: input.departmentId || null, employeeId: input.employeeId },
      });
    } else if (input.role === "STUDENT") {
      await tx.studentDetail.create({
        data: { profileId, institutionId, studentNumber: input.studentNumber },
      });
    } else {
      throw new Error("Unsupported provisioned role.");
    }
    await tx.userCredential.create({
      data: { profileId, emailNormalized, passwordHash, mustChangePassword: true, activatedAt, passwordChangedAt: null },
    });
    await tx.auditLog.create({
      data: {
        institutionId, actorId, action: "USER_PROVISIONED", entityType: "PROFILE", entityId: profileId,
        details: { role: input.role, email: emailNormalized },
      },
    });
    return tx.profile.findUnique({ where: { id: profileId }, include: profileInclude });
  });
}

export function incrementFailedLogin(profileId, lockedUntil = null) {
  return prisma.userCredential.update({
    where: { profileId },
    data: { failedLoginCount: { increment: 1 }, ...(lockedUntil ? { lockedUntil } : {}) },
  });
}

export function clearFailedLogin(profileId) {
  return prisma.userCredential.update({
    where: { profileId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

export function createAuthSession(data) {
  return prisma.authSession.create({ data });
}

export function findActiveSessionContext(familyId, now = new Date()) {
  return prisma.authSession.findFirst({
    where: { familyId, revokedAt: null, expiresAt: { gt: now }, absoluteExpiresAt: { gt: now } },
    include: {
      profile: {
        include: {
          ...profileInclude,
          credential: { select: { activatedAt: true, mustChangePassword: true, lockedUntil: true } },
        },
      },
    },
  });
}

export function revokeSessionFamily(familyId, reason = "LOGOUT") {
  return prisma.authSession.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revocationReason: reason },
  });
}

export function revokeAllProfileSessions(profileId, reason = "PASSWORD_CHANGED", tx = prisma) {
  return tx.authSession.updateMany({
    where: { profileId, revokedAt: null },
    data: { revokedAt: new Date(), revocationReason: reason },
  });
}

/** Serialize refresh rotation on the consumed token hash; reuse commits family revocation. */
export function rotateRefreshToken({ tokenHash, newTokenHash, now, idleExpiresAt, ipAddress, userAgent }) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, family_id AS "familyId", profile_id AS "profileId",
             expires_at AS "expiresAt", absolute_expires_at AS "absoluteExpiresAt",
             rotated_at AS "rotatedAt", revoked_at AS "revokedAt"
      FROM auth_sessions WHERE refresh_token_hash = ${tokenHash} FOR UPDATE
    `;
    const current = rows[0];
    if (!current) return { kind: "invalid" };
    if (current.rotatedAt || current.revokedAt) {
      await tx.authSession.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: now, revocationReason: "REFRESH_TOKEN_REUSE" },
      });
      return { kind: "reuse" };
    }
    if (current.expiresAt <= now || current.absoluteExpiresAt <= now) {
      await tx.authSession.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: now, revocationReason: "EXPIRED" },
      });
      return { kind: "invalid" };
    }

    const profile = await tx.profile.findUnique({
      where: { id: current.profileId },
      include: {
        ...profileInclude,
        credential: { select: { activatedAt: true, lockedUntil: true, mustChangePassword: true } },
      },
    });
    if (!profile?.isActive || !profile.institution?.isActive ||
        !profile.credential?.activatedAt || profile.credential.lockedUntil > now) {
      await tx.authSession.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: now, revocationReason: "ACCOUNT_DISABLED" },
      });
      return { kind: "disabled" };
    }

    await tx.authSession.update({
      where: { id: current.id },
      data: { rotatedAt: now, lastUsedAt: now, expiresAt: idleExpiresAt },
    });
    await tx.authSession.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { expiresAt: idleExpiresAt },
    });
    await tx.authSession.create({
      data: {
        familyId: current.familyId, profileId: current.profileId, refreshTokenHash: newTokenHash,
        expiresAt: idleExpiresAt, absoluteExpiresAt: current.absoluteExpiresAt,
        lastUsedAt: now, ipAddress, userAgent,
      },
    });
    return { kind: "ok", familyId: current.familyId, profile, absoluteExpiresAt: current.absoluteExpiresAt };
  });
}

export function createActivationRequest(emailNormalized, tokenHash, expiresAt) {
  return prisma.$transaction(async (tx) => {
    const profiles = await tx.profile.findMany({
      where: { email: { equals: emailNormalized, mode: "insensitive" }, institution: { isActive: true } },
      select: { id: true, isActive: true },
      take: 2,
    });
    if (profiles.length !== 1) return null;
    const profile = profiles[0];
    let credential = await tx.userCredential.findUnique({ where: { profileId: profile.id } });
    if (!profile.isActive && !credential) return null;
    if (credential?.activatedAt) return null;
    if (!credential) {
      try {
        credential = await tx.userCredential.create({
          data: { profileId: profile.id, emailNormalized, mustChangePassword: true },
        });
      } catch (error) {
        if (error.code === "P2002") return null;
        throw error;
      }
    } else if (credential.emailNormalized !== emailNormalized) {
      return null;
    }
    await tx.accountActivationToken.updateMany({
      where: { profileId: profile.id, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.accountActivationToken.create({
      data: { profileId: profile.id, tokenHash, expiresAt },
    });
    return { id: profile.id, email: emailNormalized };
  });
}

export function consumeActivationToken(tokenHash, passwordHash, now) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, profile_id AS "profileId", expires_at AS "expiresAt",
             used_at AS "usedAt", revoked_at AS "revokedAt"
      FROM account_activation_tokens WHERE token_hash = ${tokenHash} FOR UPDATE
    `;
    const token = rows[0];
    if (!token || token.usedAt || token.revokedAt || token.expiresAt <= now) return { kind: "invalid" };
    await tx.$queryRaw`SELECT id FROM profiles WHERE id = ${token.profileId}::uuid FOR UPDATE`;
    const profile = await tx.profile.findUnique({
      where: { id: token.profileId },
      include: {
        institution: { select: { isActive: true } },
        credential: { select: { activatedAt: true } },
      },
    });
    if (!profile?.institution?.isActive || profile.credential?.activatedAt) return { kind: "invalid" };
    await tx.accountActivationToken.update({ where: { id: token.id }, data: { usedAt: now } });
    await tx.userCredential.update({
      where: { profileId: token.profileId },
      data: {
        passwordHash, passwordChangedAt: now, activatedAt: now,
        mustChangePassword: false, failedLoginCount: 0, lockedUntil: null,
      },
    });
    await tx.profile.update({ where: { id: token.profileId }, data: { isActive: true } });
    await tx.accountActivationToken.updateMany({
      where: { profileId: token.profileId, id: { not: token.id }, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.auditLog.create({
      data: {
        institutionId: profile.institutionId, actorId: token.profileId,
        action: "ACCOUNT_ACTIVATED", entityType: "PROFILE", entityId: token.profileId,
      },
    });
    return { kind: "ok" };
  });
}

export function createPasswordResetRequest(emailNormalized, tokenHash, expiresAt) {
  return prisma.$transaction(async (tx) => {
    const credential = await tx.userCredential.findUnique({
      where: { emailNormalized },
      include: {
        profile: {
          select: { id: true, isActive: true, institutionId: true, institution: { select: { isActive: true } } },
        },
      },
    });
    if (!credential?.activatedAt || !credential.profile.isActive || !credential.profile.institution.isActive) return null;
    await tx.passwordResetToken.updateMany({
      where: { profileId: credential.profileId, usedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: { profileId: credential.profileId, tokenHash, expiresAt },
    });
    return { id: credential.profileId, email: credential.emailNormalized };
  });
}

export function consumePasswordReset(tokenHash, passwordHash, now) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, profile_id AS "profileId", expires_at AS "expiresAt",
             used_at AS "usedAt", revoked_at AS "revokedAt"
      FROM password_reset_tokens WHERE token_hash = ${tokenHash} FOR UPDATE
    `;
    const token = rows[0];
    if (!token || token.usedAt || token.revokedAt || token.expiresAt <= now) return { kind: "invalid" };
    await tx.$queryRaw`SELECT id FROM profiles WHERE id = ${token.profileId}::uuid FOR UPDATE`;
    const currentToken = await tx.passwordResetToken.findUnique({ where: { id: token.id } });
    if (!currentToken || currentToken.usedAt || currentToken.revokedAt || currentToken.expiresAt <= now) return { kind: "invalid" };
    const profile = await tx.profile.findUniqueOrThrow({
      where: { id: token.profileId }, select: { institutionId: true },
    });
    await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: now } });
    await tx.passwordResetToken.updateMany({
      where: { profileId: token.profileId, id: { not: token.id }, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.userCredential.update({
      where: { profileId: token.profileId },
      data: {
        passwordHash, passwordChangedAt: now, mustChangePassword: false,
        failedLoginCount: 0, lockedUntil: null,
      },
    });
    await tx.authSession.updateMany({
      where: { profileId: token.profileId, revokedAt: null },
      data: { revokedAt: now, revocationReason: "PASSWORD_RESET" },
    });
    await tx.auditLog.create({
      data: {
        institutionId: profile.institutionId, actorId: token.profileId,
        action: "PASSWORD_RESET", entityType: "PROFILE", entityId: token.profileId,
      },
    });
    return { kind: "ok" };
  });
}

export function changePassword(profileId, passwordHash, now) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUniqueOrThrow({
      where: { id: profileId }, select: { institutionId: true },
    });
    await tx.userCredential.update({
      where: { profileId },
      data: {
        passwordHash, passwordChangedAt: now, mustChangePassword: false,
        failedLoginCount: 0, lockedUntil: null,
      },
    });
    await tx.authSession.updateMany({
      where: { profileId, revokedAt: null },
      data: { revokedAt: now, revocationReason: "PASSWORD_CHANGED" },
    });
    await tx.passwordResetToken.updateMany({
      where: { profileId, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.auditLog.create({
      data: {
        institutionId: profile.institutionId, actorId: profileId,
        action: "PASSWORD_CHANGED", entityType: "PROFILE", entityId: profileId,
      },
    });
  });
}


