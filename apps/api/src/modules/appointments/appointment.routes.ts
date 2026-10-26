import { Router } from "express";
import {
  appointmentCreateSchema,
  appointmentListQuerySchema,
  appointmentStatusUpdateSchema,
  appointmentUpdateSchema,
  idParamSchema,
} from "@clinic/shared";
import { authenticate, requireRole } from "../../middlewares/auth";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import {
  createAppointmentController,
  deleteAppointmentController,
  getAppointmentController,
  listAppointmentsController,
  updateAppointmentController,
  updateAppointmentStatusController,
} from "./appointment.controller";

export const appointmentRouter = Router();

appointmentRouter.use(authenticate);

appointmentRouter.get(
  "/",
  validateQuery(appointmentListQuerySchema),
  asyncHandler(listAppointmentsController),
);
appointmentRouter.post(
  "/",
  validateBody(appointmentCreateSchema),
  asyncHandler(createAppointmentController),
);
appointmentRouter.get(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(getAppointmentController),
);
appointmentRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(appointmentUpdateSchema),
  asyncHandler(updateAppointmentController),
);
appointmentRouter.patch(
  "/:id/status",
  validateParams(idParamSchema),
  validateBody(appointmentStatusUpdateSchema),
  asyncHandler(updateAppointmentStatusController),
);
appointmentRouter.delete(
  "/:id",
  requireRole("admin"),
  validateParams(idParamSchema),
  asyncHandler(deleteAppointmentController),
);
