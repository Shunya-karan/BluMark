
import * as repository from "./admin.repository.js";
import AppError from "../../utils/AppError.js";
import prisma from "../../config/prisma.js";
import {
  createAuditLog,
  AUDIT_ACTIONS,
} from "../../utils/auditLogger.js";

function getAdminIdentity(user) {
  if (
    !user?.id ||
    !user?.institutionId ||
    user.role !== "INSTITUTION_ADMIN"
  ) {
    throw new AppError("Administrator account context is invalid", 403);
  }

  return {
    adminId: user.id,
    institutionId: user.institutionId,
  };
}

async function adminContext(user) {
  const identity = getAdminIdentity(user);

  const profile = await repository.findAdminProfile(
    identity.adminId,
    identity.institutionId,
  );

  if (!profile) {
    throw new AppError("Administrator account is unavailable", 403);
  }

  return {
    ...identity,
    profile,
  };
}

export async function getAdminProfile(user) {
  const { profile } = await adminContext(user);
  return profile;
}



export async function updateAdminProfile(user, data) {
  const admin = await adminContext(user);

  // Resolve the actual profile ID from the authenticated user.
  const adminId = admin.id ?? admin.profileId ?? user.id ?? user.profileId;
  const institutionId = admin.institutionId ?? user.institutionId;

  if (!adminId || !institutionId) {
    throw new AppError(
      "Admin profile ID or institution ID is missing",
      401
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.profile.update({
      where: {
        id_institutionId: {
          id: adminId,
          institutionId,
        },
      },
      data: {
        ...(data.fullName !== undefined && {
          fullName: data.fullName,
        }),
        ...(data.phone !== undefined && {
          phone: data.phone,
        }),
      },
      select: {
        id: true,
        institutionId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        institution: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: AUDIT_ACTIONS.ADMIN_PROFILE_UPDATED,
      entityType: "Profile",
      entityId: adminId,
      details: {
        changedFields: Object.keys(data),
      },
    });

    return updated;
  });
}



export async function getDashboardSummary(user) {
  const { institutionId } = await adminContext(user);

  return repository.getAdminDashboardSummary(institutionId);
}

export async function getRecentActivity(user, limit = 10) {
  const { institutionId } = await adminContext(user);

  return repository.findRecentInstitutionActivity(
    institutionId,
    limit,
  );
}

export async function getDashboard(user) {
  const { institutionId, profile } = await adminContext(user);

  const [
    summary,
    recentActivity,
  ] = await Promise.all([
    repository.getAdminDashboardSummary(institutionId),
    repository.findRecentInstitutionActivity(institutionId, 10),
  ]);

  return {
    administrator: {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
    },
    institution: profile.institution,
    summary,
    recentActivity,
  };
}
