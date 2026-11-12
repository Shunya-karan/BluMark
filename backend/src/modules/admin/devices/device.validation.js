
import { z } from "zod";

const uuid = z.string().uuid("Invalid ID");

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).default(""),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

export const deviceIdParamSchema = z.object({
  deviceId: uuid,
}).strict();

export const replacementRequestIdParamSchema = z.object({
  requestId: uuid,
}).strict();

export const deviceListQuerySchema = z.object({
  ...pagination,
  status: z.enum(["PENDING", "ACTIVE", "REJECTED", "REVOKED", "all"]).default("all"),
  profileId: uuid.optional(),
}).strict();

export const replacementRequestListQuerySchema = z.object({
  ...pagination,
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "all"]).default("all"),
  profileId: uuid.optional(),
}).strict();

export const deviceRejectionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

export const deviceRevocationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();