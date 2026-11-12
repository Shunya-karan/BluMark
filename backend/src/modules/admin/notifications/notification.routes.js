
import { Router } from "express";

import authenticate from "../../../middleware/authenticate.js";
import authorizeRoles from "../../../middleware/authorize.js";
import validate from "../../../middleware/validate.js";

import * as controller from "./notification.controller.js";

import {
  createNotificationSchema,
  notificationListQuerySchema,
  notificationIdParamSchema,
} from "./notification.validation.js";

const router = Router();

router.use(
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
);

router.post(
  "/notifications",
  validate(createNotificationSchema),
  controller.sendNotification,
);

router.get(
  "/notifications/stats",
  controller.getStats,
);

router.get(
  "/notifications",
  validate(notificationListQuerySchema, "query"),
  controller.listNotifications,
);

router.get(
  "/notifications/:notificationId",
  validate(notificationIdParamSchema, "params"),
  controller.getNotification,
);

export default router;
