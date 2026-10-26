import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { healthController } from "../modules/health/health.controller";
import { authRouter } from "../modules/auth/auth.routes";
import { patientRouter } from "../modules/patients/patient.routes";
import { appointmentRouter } from "../modules/appointments/appointment.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";
import { userRouter } from "../modules/users/user.routes";

export const apiRouter = Router();

apiRouter.get("/health", asyncHandler(healthController));
apiRouter.use("/auth", authRouter);
apiRouter.use("/patients", patientRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/users", userRouter);
