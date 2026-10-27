import { Router } from "express";
import rateLimit from "express-rate-limit";
import authenticate from "../../middleware/authenticate.js";
import authorizeRoles from "../../middleware/authorize.js";
import validate from "../../middleware/validate.js";
import * as controller from "./auth.controller.js";
import {
  loginSchema,
  refreshSchema,
  provisionSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation.js";
const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests. Try again later.",
  },
});
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.get("/me", authenticate, controller.me);
router.post(
  "/refresh",
  authLimiter,
  validate(refreshSchema),
  controller.refresh,
);
router.post("/logout", authenticate, controller.logout);
router.post(
  "/provision-user",
  authenticate,
  authorizeRoles("INSTITUTION_ADMIN"),
  validate(provisionSchema),
  controller.provision,
);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword,
);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword,
);
export default router;
