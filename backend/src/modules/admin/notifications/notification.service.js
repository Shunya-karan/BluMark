
import prisma from "../../../config/prisma.js";
import AppError from "../../../utils/AppError.js";
import { createAuditLog } from "../../../utils/auditLogger.js";
import * as repository from "./notification.repository.js";

const MAX_RECIPIENTS_PER_SEND = 10000;

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

export async function sendNotification(user, input) {
  const { adminId, institutionId } = adminContext(user);
  const { title, body, type, target } = input;

  return prisma.$transaction(async (tx) => {
    if (target.scope === "CLASS") {
      const schoolClass = await repository.findActiveClass(
        target.classId,
        institutionId,
        tx,
      );

      if (!schoolClass) {
        throw new AppError("Active class not found in this institution", 404);
      }
    }

    const recipients = await repository.findRecipients({
      institutionId,
      target,
      tx,
    });

    if (target.scope === "USERS") {
      if (recipients.length !== target.userIds.length) {
        throw new AppError(
          "One or more selected users are invalid, inactive, or outside this institution",
          404,
        );
      }
    }

    if (!recipients.length) {
      throw new AppError("No active recipients found for this target", 404);
    }

    if (recipients.length > MAX_RECIPIENTS_PER_SEND) {
      throw new AppError(
        `A single notification can target at most ${MAX_RECIPIENTS_PER_SEND} users`,
        413,
      );
    }

    const result = await repository.createNotifications({
      institutionId,
      senderId: adminId,
      title,
      body,
      type,
      recipientIds: recipients.map((recipient) => recipient.id),
      tx,
    });

    await createAuditLog({
      tx,
      institutionId,
      actorId: adminId,
      action: "NOTIFICATION_SENT",
      entityType: "NOTIFICATION",
      details: {
        target,
        title,
        type,
        recipientCount: result.count,
      },
    });

    return {
      sent: true,
      recipientCount: result.count,
      target,
      title,
      type,
    };
  });
}

export async function listNotifications(user, query) {
  const { institutionId } = adminContext(user);
  const {
    page,
    limit,
    ...filters
  } = query;

  const result = await repository.findNotifications({
    institutionId,
    ...filters,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    notifications: result.notifications,
    pagination: pagination(page, limit, result.total),
  };
}

export async function getNotification(user, notificationId) {
  const { institutionId } = adminContext(user);

  const notification = await repository.findNotificationById(
    notificationId,
    institutionId,
  );

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return notification;
}

export async function getStats(user) {
  const { institutionId } = adminContext(user);

  return repository.getNotificationStats(institutionId);
}
