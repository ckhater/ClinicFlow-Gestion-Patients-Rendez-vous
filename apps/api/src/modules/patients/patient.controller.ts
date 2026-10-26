import type { Request, Response } from "express";
import type {
  IdParam,
  PatientCreateInput,
  PatientListQuery,
  PatientUpdateInput,
} from "@clinic/shared";
import {
  createPatient,
  getPatientDetail,
  listPatients,
  softDeletePatient,
  updatePatient,
} from "./patient.service";

export async function listPatientsController(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PatientListQuery;
  const result = await listPatients(query);
  res.status(200).json(result);
}

export async function getPatientController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const patient = await getPatientDetail(id);
  res.status(200).json({ data: patient });
}

export async function createPatientController(req: Request, res: Response): Promise<void> {
  const patient = await createPatient(req.body as PatientCreateInput);
  res.status(201).json({ data: patient });
}

export async function updatePatientController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const patient = await updatePatient(id, req.body as PatientUpdateInput);
  res.status(200).json({ data: patient });
}

export async function deletePatientController(req: Request, res: Response): Promise<void> {
  const { id } = req.validatedParams as IdParam;
  const result = await softDeletePatient(id);
  res.status(200).json({ data: result });
}
