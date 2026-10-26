import type { Request, Response } from "express";
import type {
  AppointmentCreateInput,
  AppointmentListQuery,
  AppointmentStatusUpdateInput,
  AppointmentUpdateInput,
  IdParam,
} from "@clinic/shared";
import {
  createAppointment,
  getAppointment,
  listAppointments,
  softDeleteAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "./appointment.service";

export async function listAppointmentsController(req: Request, res: Response): Promise<void> {
  const result = await listAppointments(req.validatedQuery as AppointmentListQuery);
  res.status(200).json(result);
}

export async function getAppointmentController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const appointment = await getAppointment(id);
  res.status(200).json({ data: appointment });
}

export async function createAppointmentController(req: Request, res: Response): Promise<void> {
  if (!req.authUser) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  const appointment = await createAppointment(
    req.body as AppointmentCreateInput,
    req.authUser.id,
  );
  res.status(201).json({ data: appointment });
}

export async function updateAppointmentController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const appointment = await updateAppointment(id, req.body as AppointmentUpdateInput);
  res.status(200).json({ data: appointment });
}

export async function updateAppointmentStatusController(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const body = req.body as AppointmentStatusUpdateInput;
  const appointment = await updateAppointmentStatus(id, body.status);
  res.status(200).json({ data: appointment });
}

export async function deleteAppointmentController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const result = await softDeleteAppointment(id);
  res.status(200).json({ data: result });
}
