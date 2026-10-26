import { Router } from "express";
import {
  idParamSchema,
  patientCreateSchema,
  patientListQuerySchema,
  patientUpdateSchema,
} from "@clinic/shared";
import { authenticate, requireRole } from "../../middlewares/auth";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/async-handler";
import {
  createPatientController,
  deletePatientController,
  getPatientController,
  listPatientsController,
  updatePatientController,
} from "./patient.controller";

export const patientRouter = Router();

patientRouter.use(authenticate);

patientRouter.get(
  "/",
  validateQuery(patientListQuerySchema),
  asyncHandler(listPatientsController),
);
patientRouter.post(
  "/",
  validateBody(patientCreateSchema),
  asyncHandler(createPatientController),
);
patientRouter.get(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(getPatientController),
);
patientRouter.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(patientUpdateSchema),
  asyncHandler(updatePatientController),
);
patientRouter.delete(
  "/:id",
  requireRole("admin"),
  validateParams(idParamSchema),
  asyncHandler(deletePatientController),
);
