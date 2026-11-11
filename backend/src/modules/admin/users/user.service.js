
import prisma from "../../../config/prisma.js";
import * as repository from "./user.repository.js";
import AppError from "../../../utils/AppError.js";
import { createAuditLog } from "../../../utils/auditLogger.js";

function adminContext(user) {
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

function pagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

function buildProfileWhere(query, role) {
  const where = {};

  if (query.isActive !== "all") {
    where.isActive = query.isActive === "true";
  }

  if (query.search) {
    const search = query.search;

    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      ...(role === "STUDENT"
        ? [{
            studentDetails: {
              is: {
                studentNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          }]
        : [{
            teacherDetails: {
              is: {
                employeeId: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          }]),
    ];
  }

  if (role === "STUDENT" && query.classId) {
    where.enrollments = {
      some: {
        classId: query.classId,
        isActive: true,
      },
    };
  }

  if (role === "TEACHER" && query.departmentId) {
    where.teacherDetails = {
      is: { departmentId: query.departmentId },
    };
  }

  return where;
}

// STUDENTS

export async function listStudents(user, query) {
  const { institutionId } = adminContext(user);
  const { page, limit, sortOrder } = query;

  const result = await repository.findStudents({
    institutionId,
    where: buildProfileWhere(query, "STUDENT"),
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return {
    students: result.items.map((student) => ({
      ...student,
      activeEnrollment: student.enrollments[0] ?? null,
      enrollmentIntegrityWarning:
        student.enrollments.length > 1
          ? "Multiple active enrollments detected; resolve this data inconsistency."
          : null,
      enrollments: undefined,
    })),
    pagination: pagination(page, limit, result.total),
  };
}

export async function getStudent(user, profileId) {
  const { institutionId } = adminContext(user);

  const student = await repository.findStudent(
    profileId,
    institutionId,
  );

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const activeEnrollments = student.enrollments.filter(
    (item) => item.isActive,
  );

  return {
    ...student,
    activeEnrollment: activeEnrollments[0] ?? null,
    enrollmentIntegrityWarning:
      activeEnrollments.length > 1
        ? "Multiple active enrollments detected; resolve this data inconsistency."
        : null,
  };
}

// TEACHERS

export async function listTeachers(user, query) {
  const { institutionId } = adminContext(user);
  const { page, limit, sortOrder } = query;

  const result = await repository.findTeachers({
    institutionId,
    where: buildProfileWhere(query, "TEACHER"),
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return {
    teachers: result.items,
    pagination: pagination(page, limit, result.total),
  };
}

export async function getTeacher(user, profileId) {
  const { institutionId } = adminContext(user);

  const teacher = await repository.findTeacher(
    profileId,
    institutionId,
  );

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  return teacher;
}

// ACCOUNT STATUS

export async function updateUserStatus(user, profileId, isActive) {
  const { adminId, institutionId } = adminContext(user);

  const existing = await repository.findManageableUser(
    profileId,
    institutionId,
  );

  if (!existing) {
    throw new AppError("Student or teacher account not found", 404);
  }

  if (existing.isActive === isActive) {
    return {
      user: existing,
      changed: false,
      sessionsRevoked: 0,
    };
  }

  return prisma.$transaction(async (tx) => {
    // Lock the target profile so concurrent status changes serialize.
    await tx.$queryRaw`
      SELECT id
      FROM profiles
      WHERE id = ${profileId}::uuid
        AND institution_id = ${institutionId}::uuid
      FOR UPDATE
    `;

    const current = await repository.findManageableUser(
      profileId,
      institutionId,
      tx,
    );

    if (!current) {
      throw new AppError("Student or teacher account not found", 404);
    }

    if (current.isActive === isActive) {
      return {
        user: current,
        changed: false,
        sessionsRevoked: 0,
      };
    }

    const updated = await repository.updateUserStatus(
      profileId,
      institutionId,
      isActive,
      tx,
    );

    let sessionsRevoked = 0;

    if (!isActive) {
      const revoked = await repository.revokeUserSessions(
        profileId,
        tx,
      );
      sessionsRevoked = revoked.count;
    }

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entityType: "Profile",
      entityId: profileId,
      details: {
        role: existing.role,
        previousStatus: current.isActive,
        newStatus: isActive,
        sessionsRevoked,
      },
    });

    return {
      user: updated,
      changed: true,
      sessionsRevoked,
    };
  });
}

// ENROLLMENTS

export async function getStudentEnrollment(user, profileId) {
  const { institutionId } = adminContext(user);

  const student = await repository.findStudentForEnrollment(
    profileId,
    institutionId,
  );

  if (!student) {
    throw new AppError("Active student account not found", 404);
  }

  const enrollments = await repository.findStudentEnrollment(
    profileId,
    institutionId,
  );

  if (enrollments.length > 1) {
    return {
      activeEnrollment: enrollments[0],
      integrityWarning:
        "Multiple active enrollments detected. Assign a class to repair the enrollment state.",
    };
  }

  return {
    activeEnrollment: enrollments[0] ?? null,
    integrityWarning: null,
  };
}

export async function assignStudentEnrollment(user, profileId, classId) {
  const { adminId, institutionId } = adminContext(user);

  return prisma.$transaction(async (tx) => {
    // Serialize all enrollment changes for this student.
    const lockedProfiles = await tx.$queryRaw`
      SELECT id
      FROM profiles
      WHERE id = ${profileId}::uuid
        AND institution_id = ${institutionId}::uuid
        AND role = 'STUDENT'::user_role
        AND is_active = true
      FOR UPDATE
    `;

    if (!lockedProfiles.length) {
      throw new AppError("Active student account not found", 404);
    }

    const schoolClass = await repository.findActiveClass(
      classId,
      institutionId,
      tx,
    );

    if (!schoolClass) {
      throw new AppError("Active class not found in this institution", 404);
    }

    const existingEnrollment = await repository.findExistingEnrollment(
      profileId,
      classId,
      institutionId,
      tx,
    );

    const currentEnrollments = await repository.findStudentEnrollment(
      profileId,
      institutionId,
      tx
    );

    const alreadyAssigned =
      currentEnrollments.length === 1 &&
      currentEnrollments[0].classId === classId;

    // Deactivate other active enrollments before activating the target.
    const deactivated = await repository.deactivateOtherEnrollments(
      profileId,
      institutionId,
      classId,
      tx,
    );

    const enrollment = await repository.activateEnrollment(
      profileId,
      classId,
      institutionId,
      existingEnrollment,
      tx,
    );

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: alreadyAssigned
        ? "ENROLLMENT_CONFIRMED"
        : currentEnrollments.length > 0
          ? "ENROLLMENT_TRANSFERRED"
          : "ENROLLMENT_ASSIGNED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      details: {
        studentId: profileId,
        targetClassId: classId,
        previousActiveClassIds: currentEnrollments.map(
          (item) => item.classId,
        ),
        deactivatedEnrollmentCount: deactivated.count,
      },
    });

    return {
      enrollment,
      transferred: deactivated.count > 0,
      deactivatedEnrollmentCount: deactivated.count,
    };
  });
}
