import {
  createProfileWithDetails,
  findActiveDepartmentById,
  findActiveInstitutionById,
  findProfileById,
  findProfileByInstitutionAndEmail,
} from "./auth.repository.js";
import { sanitizeProfile } from "./auth.mapper.js";
import {
  createAdminAuthClient,
  createPublicAuthClient,
  verifyAccessToken,
} from "../../config/supabase.js";
import { getPasswordRedirect } from "../../config/frontend.js";
import AppError from "../../utils/AppError.js";

const roles = new Set(["INSTITUTION_ADMIN", "TEACHER", "STUDENT"]);

async function loadProfile(id) {
  const profile = await findProfileById(id);
  if (!profile) throw new AppError("Application profile not found", 403);
  if (!profile.isActive || !profile.institution?.isActive)
    throw new AppError("Account is inactive", 403);
  if (!roles.has(profile.role))
    throw new AppError("Account role is invalid", 403);
  return sanitizeProfile(profile);
}

export async function resolveAuthenticatedContext(accessToken) {
  const authUser = await verifyAccessToken(accessToken);
  if (!authUser?.id) throw new AppError("Invalid or expired access token", 401);
  const user = await loadProfile(authUser.id);
  return {
    authUser: { id: authUser.id },
    user,
    institutionId: user.institutionId,
  };
}

function sessionResponse(session, profile) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenType: session.token_type,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
    profile,
  };
}

export async function login({ email, password }) {
  const { data, error } =
    await createPublicAuthClient().auth.signInWithPassword({
      email,
      password,
    });
  if (error || !data?.session || !data.user)
    throw new AppError("Invalid email or password", 401);

  try {
    return sessionResponse(data.session, await loadProfile(data.user.id));
  } catch (error) {
    await createAdminAuthClient()
      .auth.admin.signOut(data.session.access_token, "local")
      .catch(() => {});
    throw error;
  }
}

export async function getCurrentUser(id) {
  return loadProfile(id);
}

export async function refreshSession(refreshToken) {
  const { data, error } = await createPublicAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data?.session || !data.user)
    throw new AppError("Invalid or expired refresh token", 401);
  return sessionResponse(data.session, await loadProfile(data.user.id));
}

export async function logout(accessToken) {
  const { error } = await createAdminAuthClient().auth.admin.signOut(
    accessToken,
    "local",
  );
  if (error) throw new AppError("Unable to revoke this session", 401);
  return {
    revoked: true,
    note: "Supabase revokes the session refresh token. The access JWT may remain valid until expiry.",
  };
}

export async function provisionUser(admin, input) {
  if (admin.role !== "INSTITUTION_ADMIN")
    throw new AppError(
      "You do not have permission to perform this action",
      403,
    );

  const institutionId = admin.institutionId;
  const institution = await findActiveInstitutionById(institutionId);
  if (!institution)
    throw new AppError("Institution not found or inactive", 404);

  let department = null;
  if (input.role === "TEACHER" && input.departmentId) {
    department = await findActiveDepartmentById(
      input.departmentId,
      institutionId,
    );
    if (!department)
      throw new AppError("Department not found in this institution", 422);
  }

  const existingProfile = await findProfileByInstitutionAndEmail(
    institutionId,
    input.email,
  );
  if (existingProfile)
    throw new AppError("A profile with this email already exists", 409);

  const adminClient = createAdminAuthClient();
  let invitation;
  try {
    invitation = await adminClient.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.fullName },
      ...(process.env.FRONTEND_URL
        ? { redirectTo: getPasswordRedirect("/auth/accept-invite") }
        : {}),
    });
  } catch {
    throw new AppError(
      "Supabase invitation outcome is uncertain. Check Supabase Auth before retrying.",
      503,
    );
  }

  const authUser = invitation.data?.user;
  if (invitation.error || !authUser?.id)
    throw new AppError(
      "Unable to invite this user. Check whether the email is already registered.",
      409,
    );

  let createdProfile;
  try {
    createdProfile = await createProfileWithDetails({
      authUserId: authUser.id,
      institutionId,
      input,
    });
  } catch (databaseError) {
    let rollbackFailed = false;
    try {
      const { error } = await adminClient.auth.admin.deleteUser(authUser.id);
      rollbackFailed = Boolean(error);
    } catch {
      rollbackFailed = true;
    }

    if (rollbackFailed) {
      console.error({
        event: "auth_provision_compensation_failed",
        code: "PROVIDER_ERROR",
      });
      throw new AppError(
        "Provisioning failed and the invited account could not be removed. Contact support before retrying.",
        500,
      );
    }
    if (databaseError.code === "P2002")
      throw new AppError("Email or identifier is already in use", 409);
    throw new AppError(
      "Profile creation failed; the invited authentication account was removed",
      500,
    );
  }

  return {
    profile: sanitizeProfile({
      ...createdProfile,
      institution,
      studentDetails:
        input.role === "STUDENT"
          ? { studentNumber: input.studentNumber }
          : null,
      teacherDetails:
        input.role === "TEACHER"
          ? { employeeId: input.employeeId, department }
          : null,
    }),
    invitationSent: true,
  };
}

export async function changePassword(id, email, currentPassword, newPassword) {
  const { data, error: authError } =
    await createPublicAuthClient().auth.signInWithPassword({
      email,
      password: currentPassword,
    });
  if (authError || data?.user?.id !== id)
    throw new AppError("Current password is incorrect", 401);

  const { error } = await createAdminAuthClient().auth.admin.updateUserById(
    id,
    {
      password: newPassword,
    },
  );
  if (error) throw new AppError("Unable to change password", 422);
  return { changed: true };
}

export async function forgotPassword(email) {
  if (process.env.FRONTEND_URL) {
    try {
      const { error } =
        await createPublicAuthClient().auth.resetPasswordForEmail(email, {
          redirectTo: getPasswordRedirect("/auth/reset-password"),
        });
      if (error)
        console.error({
          event: "password_recovery_request_failed",
          code: error.code || "PROVIDER_ERROR",
        });
    } catch {
      // Return the same message whether the address exists or not.
    }
  }

  return {
    message:
      "If an account exists for that email, password reset instructions will be sent.",
  };
}

export async function resetPassword(tokenHash, newPassword) {
  const { data, error } = await createPublicAuthClient().auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });
  if (error || !data?.user?.id)
    throw new AppError("Invalid or expired recovery link", 400);

  const profile = await loadProfile(data.user.id);
  const { error: updateError } =
    await createAdminAuthClient().auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
  if (updateError) throw new AppError("Unable to reset password", 422);
  return { reset: true };
}

export default {
  resolveAuthenticatedContext,
  login,
  getCurrentUser,
  refreshSession,
  logout,
  provisionUser,
  changePassword,
  forgotPassword,
  resetPassword,
};
