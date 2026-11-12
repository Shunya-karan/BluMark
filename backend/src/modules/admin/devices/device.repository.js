
import prisma from "../../../config/prisma.js";

const deviceSelect = {
  id: true,
  institutionId: true,
  profileId: true,
  deviceIdentifier: true,
  status: true,
  registeredAt: true,
  reviewedAt: true,
  rejectionReason: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isActive: true,
      studentDetails: {
        select: { studentNumber: true },
      },
    },
  },
  reviewer: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

const replacementSelect = {
  id: true,
  institutionId: true,
  profileId: true,
  requestedDeviceIdentifier: true,
  reason: true,
  status: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  requester: {
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      studentDetails: {
        select: { studentNumber: true },
      },
    },
  },
  reviewer: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
};

function buildDeviceWhere({ institutionId, status, profileId, search }) {
  const where = { institutionId };

  if (status !== "all") where.status = status;
  if (profileId) where.profileId = profileId;

  if (search) {
    where.OR = [
      {
        deviceIdentifier: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        student: {
          is: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        student: {
          is: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        student: {
          is: {
            studentDetails: {
              is: {
                studentNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
    ];
  }

  return where;
}

function buildReplacementWhere({ institutionId, status, profileId, search }) {
  const where = { institutionId };

  if (status !== "all") where.status = status;
  if (profileId) where.profileId = profileId;

  if (search) {
    where.OR = [
      {
        requestedDeviceIdentifier: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        requester: {
          is: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        requester: {
          is: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
      {
        requester: {
          is: {
            studentDetails: {
              is: {
                studentNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
    ];
  }

  return where;
}

export async function findDevices({
  institutionId,
  status,
  profileId,
  search,
  skip,
  take,
  sortOrder,
}) {
  const where = buildDeviceWhere({
    institutionId,
    status,
    profileId,
    search,
  });

  const [total, devices] = await Promise.all([
    prisma.device.count({ where }),
    prisma.device.findMany({
      where,
      skip,
      take,
      orderBy: { registeredAt: sortOrder },
      select: deviceSelect,
    }),
  ]);

  return { total, devices };
}

export function findDeviceById(deviceId, institutionId, db = prisma) {
  return db.device.findFirst({
    where: { id: deviceId, institutionId },
    select: deviceSelect,
  });
}

export async function findReplacementRequests({
  institutionId,
  status,
  profileId,
  search,
  skip,
  take,
  sortOrder,
}) {
  const where = buildReplacementWhere({
    institutionId,
    status,
    profileId,
    search,
  });

  const [total, requests] = await Promise.all([
    prisma.deviceReplacementRequest.count({ where }),
    prisma.deviceReplacementRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: sortOrder },
      select: replacementSelect,
    }),
  ]);

  return { total, requests };
}

export function findReplacementRequestById(requestId, institutionId, db = prisma) {
  return db.deviceReplacementRequest.findFirst({
    where: { id: requestId, institutionId },
    select: replacementSelect,
  });
}

export { deviceSelect, replacementSelect };