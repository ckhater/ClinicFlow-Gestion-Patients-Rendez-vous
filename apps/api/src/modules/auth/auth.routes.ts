import { Router } from "express";
import { loginSchema } from "@clinic/shared";
import { loginRateLimiter } from "../../middlewares/rate-limit";
import { validateBody } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  csrfController,
  loginController,
  logoutController,
  meController,
} from "./auth.controller";

export const authRouter = Router();

authRouter.get("/csrf", csrfController);
authRouter.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  asyncHandler(loginController),
);
authRouter.get("/me", authenticate, meController);
authRouter.post("/logout", logoutController);
