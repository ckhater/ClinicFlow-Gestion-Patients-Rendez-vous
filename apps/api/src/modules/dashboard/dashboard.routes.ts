import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/async-handler";
import { dashboardStatsController } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/stats", asyncHandler(dashboardStatsController));
