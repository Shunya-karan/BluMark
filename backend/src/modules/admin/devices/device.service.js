
import prisma from "../../../config/prisma.js";
import AppError from "../../../utils/AppError.js";
import { createAuditLog } from "../../../utils/auditLogger.js";
import * as repository from "./device.repository.js";

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

function handleUniqueConflict(error) {
  if (error?.code === "P2002") {
    throw new AppError(
      "This device identifier is already registered or in use.",
      409,
    );
  }

  throw error;
}

// --------------------------------------------------
// DEVICE LIST AND DETAILS
// --------------------------------------------------

export async function listDevices(user, query) {
  const { institutionId } = adminContext(user);
  const { page, limit, sortOrder, ...filters } = query;

  const result = await repository.findDevices({
    institutionId,
    ...filters,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return {
    devices: result.devices,
    pagination: pagination(page, limit, result.total),
  };
}

export async function getDevice(user, deviceId) {
  const { institutionId } = adminContext(user);

  const device = await repository.findDeviceById(
    deviceId,
    institutionId,
  );

  if (!device) throw new AppError("Device not found", 404);

  return device;
}

// --------------------------------------------------
// LOCK STUDENT PROFILE
// --------------------------------------------------

async function lockStudent(tx, profileId, institutionId) {
  const rows = await tx.$queryRaw`
    SELECT id
    FROM profiles
    WHERE id = ${profileId}::uuid
      AND institution_id = ${institutionId}::uuid
      AND role = 'STUDENT'::user_role
      AND is_active = true
    FOR UPDATE
  `;

  if (!rows.length) {
    throw new AppError("Active student account not found", 404);
  }
}

// --------------------------------------------------
// APPROVE INITIAL DEVICE REGISTRATION
// --------------------------------------------------

export async function approveDevice(user, deviceId) {
  const { adminId, institutionId } = adminContext(user);

  try {
    return await prisma.$transaction(async (tx) => {
      const initial = await tx.device.findFirst({
        where: { id: deviceId, institutionId },
        select: {
          id: true,
          profileId: true,
          status: true,
        },
      });

      if (!initial) throw new AppError("Device not found", 404);

      await lockStudent(tx, initial.profileId, institutionId);

      const device = await tx.device.findFirst({
        where: { id: deviceId, institutionId },
        select: {
          id: true,
          profileId: true,
          status: true,
          deviceIdentifier: true,
        },
      });

      if (!device) throw new AppError("Device not found", 404);

      if (device.status !== "PENDING") {
        throw new AppError("Only pending device registrations can be approved", 409);
      }

      const activeDevice = await tx.device.findFirst({
        where: {
          institutionId,
          profileId: device.profileId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (activeDevice) {
        throw new AppError(
          "This student already has an active device. Process a replacement request instead.",
          409,
        );
      }

      const now = new Date();

      const updated = await tx.device.update({
        where: { id: deviceId },
        data: {
          status: "ACTIVE",
          reviewedBy: adminId,
          reviewedAt: now,
          rejectionReason: null,
        },
        select: repository.deviceSelect,
      });

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: "DEVICE_REGISTRATION_APPROVED",
        entityType: "DEVICE",
        entityId: deviceId,
        details: {
          profileId: device.profileId,
          deviceIdentifier: device.deviceIdentifier,
        },
      });

      return { device: updated, approved: true };
    });
  } catch (error) {
    handleUniqueConflict(error);
  }
}

// --------------------------------------------------
// REJECT INITIAL DEVICE REGISTRATION
// --------------------------------------------------

export async function rejectDevice(user, deviceId, reason) {
  const { adminId, institutionId } = adminContext(user);

  return prisma.$transaction(async (tx) => {
    const initial = await tx.device.findFirst({
      where: { id: deviceId, institutionId },
      select: { id: true, profileId: true },
    });

    if (!initial) throw new AppError("Device not found", 404);

    await lockStudent(tx, initial.profileId, institutionId);

    const device = await tx.device.findFirst({
      where: { id: deviceId, institutionId },
      select: {
        id: true,
        profileId: true,
        status: true,
        deviceIdentifier: true,
      },
    });

    if (!device) throw new AppError("Device not found", 404);

    if (device.status !== "PENDING") {
      throw new AppError("Only pending device registrations can be rejected", 409);
    }

    const updated = await tx.device.update({
      where: { id: deviceId },
      data: {
        status: "REJECTED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      select: repository.deviceSelect,
    });

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: "DEVICE_REGISTRATION_REJECTED",
      entityType: "DEVICE",
      entityId: deviceId,
      details: {
        profileId: device.profileId,
        deviceIdentifier: device.deviceIdentifier,
        reason,
      },
    });

    return { device: updated, rejected: true };
  });
}

// --------------------------------------------------
// REVOKE ACTIVE DEVICE
// --------------------------------------------------

export async function revokeDevice(user, deviceId, reason) {
  const { adminId, institutionId } = adminContext(user);

  return prisma.$transaction(async (tx) => {
    const initial = await tx.device.findFirst({
      where: { id: deviceId, institutionId },
      select: { id: true, profileId: true },
    });

    if (!initial) throw new AppError("Device not found", 404);

    await lockStudent(tx, initial.profileId, institutionId);

    const device = await tx.device.findFirst({
      where: { id: deviceId, institutionId },
      select: {
        id: true,
        profileId: true,
        status: true,
        deviceIdentifier: true,
      },
    });

    if (!device) throw new AppError("Device not found", 404);

    if (device.status !== "ACTIVE") {
      throw new AppError("Only active devices can be revoked", 409);
    }

    const updated = await tx.device.update({
      where: { id: deviceId },
      data: {
        status: "REVOKED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      select: repository.deviceSelect,
    });

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: "DEVICE_REVOKED",
      entityType: "DEVICE",
      entityId: deviceId,
      details: {
        profileId: device.profileId,
        deviceIdentifier: device.deviceIdentifier,
        reason,
      },
    });

    return { device: updated, revoked: true };
  });
}

// --------------------------------------------------
// REPLACEMENT REQUEST LIST AND DETAILS
// --------------------------------------------------

export async function listReplacementRequests(user, query) {
  const { institutionId } = adminContext(user);
  const { page, limit, sortOrder, ...filters } = query;

  const result = await repository.findReplacementRequests({
    institutionId,
    ...filters,
    skip: (page - 1) * limit,
    take: limit,
    sortOrder,
  });

  return {
    requests: result.requests,
    pagination: pagination(page, limit, result.total),
  };
}

export async function getReplacementRequest(user, requestId) {
  const { institutionId } = adminContext(user);

  const request = await repository.findReplacementRequestById(
    requestId,
    institutionId,
  );

  if (!request) throw new AppError("Replacement request not found", 404);

  return request;
}

// --------------------------------------------------
// APPROVE DEVICE REPLACEMENT
// --------------------------------------------------

export async function approveReplacement(user, requestId) {
  const { adminId, institutionId } = adminContext(user);

  try {
    return await prisma.$transaction(async (tx) => {
      const initial = await tx.deviceReplacementRequest.findFirst({
        where: { id: requestId, institutionId },
        select: {
          id: true,
          profileId: true,
        },
      });

      if (!initial) {
        throw new AppError("Replacement request not found", 404);
      }

      await lockStudent(tx, initial.profileId, institutionId);

      const request = await tx.deviceReplacementRequest.findFirst({
        where: { id: requestId, institutionId },
        select: {
          id: true,
          profileId: true,
          requestedDeviceIdentifier: true,
          publicKey: true,
          status: true,
          reason: true,
        },
      });

      if (!request) {
        throw new AppError("Replacement request not found", 404);
      }

      if (request.status !== "PENDING") {
        throw new AppError("Only pending replacement requests can be approved", 409);
      }

      const activeDevice = await tx.device.findFirst({
        where: {
          institutionId,
          profileId: request.profileId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          deviceIdentifier: true,
        },
      });

      if (!activeDevice) {
        throw new AppError(
          "The student has no active device to replace. Reject this request and ask the student to register a device.",
          409,
        );
      }

      const identifierInUse = await tx.device.findFirst({
        where: {
          institutionId,
          deviceIdentifier: request.requestedDeviceIdentifier,
        },
        select: { id: true },
      });

      if (identifierInUse) {
        throw new AppError("The requested device is already registered", 409);
      }

      const now = new Date();

      const newDevice = await tx.device.create({
        data: {
          institutionId,
          profileId: request.profileId,
          deviceIdentifier: request.requestedDeviceIdentifier,
          publicKey: request.publicKey,
          status: "ACTIVE",
          reviewedBy: adminId,
          reviewedAt: now,
        },
        select: {
          id: true,
          profileId: true,
          deviceIdentifier: true,
          status: true,
          registeredAt: true,
        },
      });

      await tx.device.update({
        where: { id: activeDevice.id },
        data: {
          status: "REVOKED",
          reviewedBy: adminId,
          reviewedAt: now,
        },
      });

      const updatedRequest = await tx.deviceReplacementRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedBy: adminId,
          reviewedAt: now,
          rejectionReason: null,
        },
        select: repository.replacementSelect,
      });

      await createAuditLog({
        tx,
        institutionId,
        actorId: adminId,
        action: "DEVICE_REPLACEMENT_APPROVED",
        entityType: "DEVICE_REPLACEMENT_REQUEST",
        entityId: requestId,
        details: {
          profileId: request.profileId,
          oldDeviceId: activeDevice.id,
          oldDeviceIdentifier: activeDevice.deviceIdentifier,
          newDeviceId: newDevice.id,
          newDeviceIdentifier: newDevice.deviceIdentifier,
        },
      });

      return {
        request: updatedRequest,
        newDevice,
        revokedDeviceId: activeDevice.id,
        approved: true,
      };
    });
  } catch (error) {
    handleUniqueConflict(error);
  }
}

// --------------------------------------------------
// REJECT DEVICE REPLACEMENT
// --------------------------------------------------

export async function rejectReplacement(user, requestId, reason) {
  const { adminId, institutionId } = adminContext(user);

  return prisma.$transaction(async (tx) => {
    const initial = await tx.deviceReplacementRequest.findFirst({
      where: { id: requestId, institutionId },
      select: {
        id: true,
        profileId: true,
      },
    });

    if (!initial) {
      throw new AppError("Replacement request not found", 404);
    }

    await lockStudent(tx, initial.profileId, institutionId);

    const request = await tx.deviceReplacementRequest.findFirst({
      where: { id: requestId, institutionId },
      select: {
        id: true,
        profileId: true,
        requestedDeviceIdentifier: true,
        status: true,
      },
    });

    if (!request) {
      throw new AppError("Replacement request not found", 404);
    }

    if (request.status !== "PENDING") {
      throw new AppError("Only pending replacement requests can be rejected", 409);
    }

    const updated = await tx.deviceReplacementRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      select: repository.replacementSelect,
    });

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: "DEVICE_REPLACEMENT_REJECTED",
      entityType: "DEVICE_REPLACEMENT_REQUEST",
      entityId: requestId,
      details: {
        profileId: request.profileId,
        requestedDeviceIdentifier: request.requestedDeviceIdentifier,
        reason,
      },
    });

    return { request: updated, rejected: true };
  });
}