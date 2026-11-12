
import prisma from "../../../config/prisma.js";

const notificationSelect = {
  id: true,
  title: true,
  body: true,
  type: true,
  readAt: true,
  createdAt: true,
  recipient: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      studentDetails: {
        select: { studentNumber: true },
      },
      teacherDetails: {
        select: { employeeId: true },
      },
    },
  },
  sender: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

export async function findActiveClass(classId, institutionId, tx) {
  return tx.schoolClass.findFirst({
    where: {
      id: classId,
      institutionId,
      isActive: true,
    },
    select: { id: true },
  });
}

export async function findRecipients({
  institutionId,
  target,
  tx,
}) {
  const where = {
    institutionId,
    isActive: true,
    role: { in: ["STUDENT", "TEACHER"] },
  };

  if (target.scope === "ROLE") {
    where.role = target.role;
  }

  if (target.scope === "CLASS") {
    where.role = "STUDENT";
    where.enrollments = {
      some: {
        institutionId,
        classId: target.classId,
        isActive: true,
      },
    };
  }

  if (target.scope === "USERS") {
    where.id = { in: target.userIds };
  }

  return tx.profile.findMany({
    where,
    select: {
      id: true,
      role: true,
    },
  });
}

export async function createNotifications({
  institutionId,
  senderId,
  title,
  body,
  type,
  recipientIds,
  tx,
}) {
  return tx.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      institutionId,
      recipientId,
      senderId,
      title,
      body,
      type,
    })),
  });
}

function buildNotificationWhere({
  institutionId,
  search,
  type,
  recipientRole,
  readStatus,
}) {
  return {
    institutionId,
    ...(type ? { type } : {}),
    ...(readStatus === "READ" ? { readAt: { not: null } } : {}),
    ...(readStatus === "UNREAD" ? { readAt: null } : {}),
    ...(recipientRole
      ? { recipient: { is: { role: recipientRole } } }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
            {
              recipient: {
                is: {
                  fullName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              recipient: {
                is: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function findNotifications({
  institutionId,
  search,
  type,
  recipientRole,
  readStatus,
  skip,
  take,
  sortOrder,
}) {
  const where = buildNotificationWhere({
    institutionId,
    search,
    type,
    recipientRole,
    readStatus,
  });

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: { createdAt: sortOrder },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

export function findNotificationById(notificationId, institutionId) {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      institutionId,
    },
    select: notificationSelect,
  });
}

export async function getNotificationStats(institutionId) {
  const [total, read, unread] = await Promise.all([
    prisma.notification.count({
      where: { institutionId },
    }),
    prisma.notification.count({
      where: {
        institutionId,
        readAt: { not: null },
      },
    }),
    prisma.notification.count({
      where: {
        institutionId,
        readAt: null,
      },
    }),
  ]);

  return {
    total,
    read,
    unread,
    readPercentage: total
      ? Number(((read / total) * 100).toFixed(2))
      : 0,
  };
}

