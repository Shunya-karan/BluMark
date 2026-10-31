import { Router } from "express";
import rateLimit from "express-rate-limit";
import authenticate from "../../middleware/authenticate.js";
import authorizeRoles from "../../middleware/authorize.js";
import validate from "../../middleware/validate.js";
import * as controller from "./auth.controller.js";
import {
  activationCompleteSchema,
  activationRequestSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  provisionBulkSchema,
  provisionSchema,
  refreshSchema,
  resetPasswordSchema,
} from "./auth.validation.js";

const router = Router();
const limiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication requests. Try again later." },
});

router.post("/login", limiter(10), validate(loginSchema), controller.login);
router.post("/refresh", limiter(30), validate(refreshSchema), controller.refresh);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.me);
router.post(
  "/provision-user",
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
  validate(provisionSchema),
  controller.provision,
);
router.post(
  "/provision-users",
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
  validate(provisionBulkSchema),
  controller.provisionBulk,
);
router.post(
  "/provision-user/:profileId/resend-credentials",
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
  limiter(5),
  controller.resendCredentials,
);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword,
);
router.post("/activation/request", limiter(5), validate(activationRequestSchema), controller.requestActivation);
router.post("/activation/complete", limiter(10), validate(activationCompleteSchema), controller.activate);
router.post("/forgot-password", limiter(5), validate(forgotPasswordSchema), controller.forgotPassword);
router.post("/reset-password", limiter(10), validate(resetPasswordSchema), controller.resetPassword);

export default router;

