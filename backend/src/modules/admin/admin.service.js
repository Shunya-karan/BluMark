
import * as repository from "./admin.repository.js";
import AppError from "../../utils/AppError.js";

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
  const { adminId, institutionId } = await adminContext(user);

  return repository.updateAdminProfile(
    adminId,
    institutionId,
    data,
  );
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
