
import prisma from "../../../config/prisma.js";
import AppError from "../../../utils/AppError.js";
import {
  createAuditLog,
} from "../../../utils/auditLogger.js";
import * as repository from "./academic.repository.js";
import * as adminRepository from "../admin.repository.js";

async function getAdminContext(user) {
  if (
    !user?.id ||
    !user?.institutionId ||
    user.role !== "INSTITUTION_ADMIN"
  ) {
    throw new AppError("Administrator account context is invalid", 403);
  }

  const profile = await adminRepository.findAdminProfile(
    user.id,
    user.institutionId,
  );

  if (!profile) {
    throw new AppError("Administrator account is unavailable", 403);
  }

  return {
    adminId: profile.id,
    institutionId: profile.institutionId,
  };
}

function paginationResult(items, total, page, limit) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function activeFilter(value) {
  if (value === "true") return { isActive: true };
  if (value === "false") return { isActive: false };
  return {};
}

function handleDuplicate(error, message) {
  if (error?.code === "P2002") {
    throw new AppError(message, 409);
  }
  throw error;
}

// ======================================================
// DEPARTMENTS
// ======================================================

export async function createDepartment(user, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  try {
    return await prisma.$transaction(async (tx) => {
      const department = await repository.createDepartment(
        { institutionId, ...data },
        tx,
      );

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: "DEPARTMENT_CREATED",
        entityType: "Department",
        entityId: department.id,
        details: { name: department.name, code: department.code },
      });

      return department;
    });
  } catch (error) {
    handleDuplicate(error, "A department with this code already exists");
  }
}

export async function listDepartments(user, query) {
  const { institutionId } = await getAdminContext(user);
  const { page, limit, search, sortOrder, isActive } = query;

  const where = {
    ...activeFilter(isActive),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const result = await repository.findDepartments({
    institutionId,
    where,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return paginationResult(result.items, result.total, page, limit);
}

export async function getDepartment(user, departmentId) {
  const { institutionId } = await getAdminContext(user);

  const department = await repository.findDepartment(
    departmentId,
    institutionId,
  );

  if (!department) throw new AppError("Department not found", 404);

  return department;
}

export async function updateDepartment(user, departmentId, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  const existing = await repository.findDepartment(
    departmentId,
    institutionId,
  );

  if (!existing) throw new AppError("Department not found", 404);

  try {
    return await prisma.$transaction(async (tx) => {
      const department = await repository.updateDepartment(
        departmentId,
        institutionId,
        data,
        tx,
      );

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: data.isActive === false
          ? "DEPARTMENT_DEACTIVATED"
          : "DEPARTMENT_UPDATED",
        entityType: "Department",
        entityId: departmentId,
        details: { changedFields: Object.keys(data) },
      });

      return department;
    });
  } catch (error) {
    handleDuplicate(error, "A department with this code already exists");
  }
}

// ======================================================
// CLASSES
// ======================================================

export async function createClass(user, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  if (data.departmentId) {
    const department = await repository.findDepartmentForInstitution(
      data.departmentId,
      institutionId,
    );

    if (!department) {
      throw new AppError("Department not found or inactive", 404);
    }
  }

  const duplicate = await repository.findDuplicateClass({
    institutionId,
    name: data.name,
    division: data.division ?? null,
    academicYear: data.academicYear,
    semester: data.semester ?? null,
  });

  if (duplicate) {
    throw new AppError(
      "A class with the same name, division, academic year and semester already exists",
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    const schoolClass = await repository.createClass(
      {
        institutionId,
        name: data.name,
        division: data.division ?? null,
        academicYear: data.academicYear,
        semester: data.semester ?? null,
        departmentId: data.departmentId ?? null,
      },
      tx,
    );

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: "CLASS_CREATED",
      entityType: "SchoolClass",
      entityId: schoolClass.id,
      details: {
        name: schoolClass.name,
        academicYear: schoolClass.academicYear,
        division: schoolClass.division,
      },
    });

    return schoolClass;
  });
}

export async function listClasses(user, query) {
  const { institutionId } = await getAdminContext(user);
  const {
    page,
    limit,
    search,
    sortOrder,
    academicYear,
    departmentId,
    isActive,
  } = query;

  const where = {
    ...activeFilter(isActive),
    ...(academicYear ? { academicYear } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(search
      ? { name: { contains: search, mode: "insensitive" } }
      : {}),
  };

  const result = await repository.findClasses({
    institutionId,
    where,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return paginationResult(result.items, result.total, page, limit);
}

export async function getClass(user, classId) {
  const { institutionId } = await getAdminContext(user);

  const schoolClass = await repository.findClass(classId, institutionId);

  if (!schoolClass) throw new AppError("Class not found", 404);

  return schoolClass;
}

export async function updateClass(user, classId, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  const existing = await repository.findClass(classId, institutionId);

  if (!existing) throw new AppError("Class not found", 404);

  const next = {
    name: data.name ?? existing.name,
    division: data.division !== undefined
      ? data.division
      : existing.division,
    academicYear: data.academicYear ?? existing.academicYear,
    semester: data.semester !== undefined
      ? data.semester
      : existing.semester,
  };

  if (data.departmentId) {
    const department = await repository.findDepartmentForInstitution(
      data.departmentId,
      institutionId,
    );

    if (!department) {
      throw new AppError("Department not found or inactive", 404);
    }
  }

  const duplicate = await repository.findDuplicateClass({
    institutionId,
    ...next,
    excludeId: classId,
  });

  if (duplicate) {
    throw new AppError("Another class already has these details", 409);
  }

  return prisma.$transaction(async (tx) => {
    const schoolClass = await repository.updateClass(
      classId,
      institutionId,
      data,
      tx,
    );

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: data.isActive === false ? "CLASS_DEACTIVATED" : "CLASS_UPDATED",
      entityType: "SchoolClass",
      entityId: classId,
      details: { changedFields: Object.keys(data) },
    });

    return schoolClass;
  });
}

// ======================================================
// SUBJECTS
// ======================================================

export async function createSubject(user, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  try {
    return await prisma.$transaction(async (tx) => {
      const subject = await repository.createSubject(
        { institutionId, ...data },
        tx,
      );

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: "SUBJECT_CREATED",
        entityType: "Subject",
        entityId: subject.id,
        details: { name: subject.name, code: subject.code },
      });

      return subject;
    });
  } catch (error) {
    handleDuplicate(error, "A subject with this code already exists");
  }
}

export async function listSubjects(user, query) {
  const { institutionId } = await getAdminContext(user);
  const { page, limit, search, sortOrder, isActive } = query;

  const where = {
    ...activeFilter(isActive),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const result = await repository.findSubjects({
    institutionId,
    where,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return paginationResult(result.items, result.total, page, limit);
}

export async function getSubject(user, subjectId) {
  const { institutionId } = await getAdminContext(user);

  const subject = await repository.findSubject(subjectId, institutionId);

  if (!subject) throw new AppError("Subject not found", 404);

  return subject;
}

export async function updateSubject(user, subjectId, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  const existing = await repository.findSubject(subjectId, institutionId);

  if (!existing) throw new AppError("Subject not found", 404);

  try {
    return await prisma.$transaction(async (tx) => {
      const subject = await repository.updateSubject(
        subjectId,
        institutionId,
        data,
        tx,
      );

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: data.isActive === false ? "SUBJECT_DEACTIVATED" : "SUBJECT_UPDATED",
        entityType: "Subject",
        entityId: subjectId,
        details: { changedFields: Object.keys(data) },
      });

      return subject;
    });
  } catch (error) {
    handleDuplicate(error, "A subject with this code already exists");
  }
}

// ======================================================
// TEACHER ASSIGNMENTS
// ======================================================

export async function createAssignment(user, data) {
  const { adminId, institutionId } = await getAdminContext(user);

  const [schoolClass, subject, teacher] = await Promise.all([
    repository.findActiveClass(data.classId, institutionId),
    repository.findActiveSubject(data.subjectId, institutionId),
    repository.findTeacher(data.teacherId, institutionId),
  ]);

  if (!schoolClass) throw new AppError("Class not found or inactive", 404);
  if (!subject) throw new AppError("Subject not found or inactive", 404);
  if (!teacher) throw new AppError("Active teacher not found", 404);

  try {
    return await prisma.$transaction(async (tx) => {
      const assignment = await repository.createAssignment(
        {
          institutionId,
          classId: data.classId,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
        },
        tx,
      );

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: "TEACHER_ASSIGNED",
        entityType: "ClassSubject",
        entityId: assignment.id,
        details: {
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
        },
      });

      return assignment;
    });
  } catch (error) {
    handleDuplicate(error, "This teacher is already assigned to this class and subject");
  }
}

export async function listAssignments(user, query) {
  const { institutionId } = await getAdminContext(user);
  const { page, limit, search, sortOrder, classId, subjectId, teacherId } = query;

  const where = {
    ...(classId ? { classId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(teacherId ? { teacherId } : {}),
    ...(search
      ? {
          OR: [
            {
              schoolClass: {
                name: { contains: search, mode: "insensitive" },
              },
            },
            {
              subject: {
                name: { contains: search, mode: "insensitive" },
              },
            },
            {
              teacher: {
                fullName: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const result = await repository.findAssignments({
    institutionId,
    where,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return paginationResult(result.items, result.total, page, limit);
}

export async function getAssignment(user, assignmentId) {
  const { institutionId } = await getAdminContext(user);

  const assignment = await repository.findAssignment(
    assignmentId,
    institutionId,
  );

  if (!assignment) throw new AppError("Teacher assignment not found", 404);

  return assignment;
}

export async function reassignTeacher(user, assignmentId, teacherId) {
  const { adminId, institutionId } = await getAdminContext(user);

  const existing = await repository.findAssignment(
    assignmentId,
    institutionId,
  );

  if (!existing) throw new AppError("Teacher assignment not found", 404);

  if (existing.teacherId === teacherId) {
    throw new AppError("This teacher is already assigned", 409);
  }

  const teacher = await repository.findTeacher(teacherId, institutionId);

  if (!teacher) throw new AppError("Active teacher not found", 404);

  try {
    return await prisma.$transaction(async (tx) => {
      const assignment = await repository.reassignTeacher(
        assignmentId,
        institutionId,
        teacherId,
        tx,
      );

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: "TEACHER_REASSIGNED",
        entityType: "ClassSubject",
        entityId: assignmentId,
        details: {
          previousTeacherId: existing.teacherId,
          newTeacherId: teacherId,
          classId: existing.classId,
          subjectId: existing.subjectId,
        },
      });

      return assignment;
    });
  } catch (error) {
    handleDuplicate(error, "This teacher is already assigned to this class and subject");
  }
}
