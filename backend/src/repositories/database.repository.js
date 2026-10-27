import prisma from "../config/prisma.js";

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`select 1`;
}

export function disconnectDatabase() {
  return prisma.$disconnect();
}
