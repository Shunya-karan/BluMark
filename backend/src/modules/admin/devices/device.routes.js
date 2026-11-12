
import { Router } from "express";

import authenticate from "../../../middleware/authenticate.js";
import authorizeRoles from "../../../middleware/authorize.js";
import validate from "../../../middleware/validate.js";

import * as controller from "./device.controller.js";

import {
  deviceIdParamSchema,
  replacementRequestIdParamSchema,
  deviceListQuerySchema,
  replacementRequestListQuerySchema,
  deviceRejectionSchema,
  deviceRevocationSchema,
} from "./device.validation.js";

const router = Router();

router.use(
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
);

// DEVICES

router.get(
  "/devices",
  validate(deviceListQuerySchema, "query"),
  controller.listDevices,
);

router.get(
  "/devices/:deviceId",
  validate(deviceIdParamSchema, "params"),
  controller.getDevice,
);

router.patch(
  "/devices/:deviceId/approve",
  validate(deviceIdParamSchema, "params"),
  controller.approveDevice,
);

router.patch(
  "/devices/:deviceId/reject",
  validate(deviceIdParamSchema, "params"),
  validate(deviceRejectionSchema),
  controller.rejectDevice,
);

router.patch(
  "/devices/:deviceId/revoke",
  validate(deviceIdParamSchema, "params"),
  validate(deviceRevocationSchema),
  controller.revokeDevice,
);

// DEVICE REPLACEMENT REQUESTS

router.get(
  "/device-replacement-requests",
  validate(replacementRequestListQuerySchema, "query"),
  controller.listReplacementRequests,
);

router.get(
  "/device-replacement-requests/:requestId",
  validate(replacementRequestIdParamSchema, "params"),
  controller.getReplacementRequest,
);

router.patch(
  "/device-replacement-requests/:requestId/approve",
  validate(replacementRequestIdParamSchema, "params"),
  controller.approveReplacement,
);

router.patch(
  "/device-replacement-requests/:requestId/reject",
  validate(replacementRequestIdParamSchema, "params"),
  validate(deviceRejectionSchema),
  controller.rejectReplacement,
);

export default router;