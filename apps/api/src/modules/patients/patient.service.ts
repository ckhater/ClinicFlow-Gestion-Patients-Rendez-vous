import type { Prisma } from "@prisma/client";
import {
  normalizeCin,
  type PatientCreateInput,
  type PatientListQuery,
  type PatientUpdateInput,
} from "@clinic/shared";
import { prisma } from "../../lib/prisma";
import { conflict, notFound } from "../../utils/errors";
import { buildPaginationMeta, paginationSkip } from "../../utils/pagination";
import { patientSelect, appointmentInclude } from "../../utils/selectors";
import { serializePatient, serializePatientDetail } from "../../utils/serializers";

function patientOrderBy(query: PatientListQuery): Prisma.PatientOrderByWithRelationInput {
  switch (query.sortBy) {
    case "fullName":
      return { fullName: query.sortOrder };
    case "birthDate":
      return { birthDate: query.sortOrder };
    case "createdAt":
    default:
      return { createdAt: query.sortOrder };
  }
}

export async function listPatients(query: PatientListQuery) {
  const search = query.search?.trim();
  const where: Prisma.PatientWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { cin: { contains: normalizeCin(search), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, patients] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      select: patientSelect,
      orderBy: patientOrderBy(query),
      skip: paginationSkip(query.page, query.limit),
      take: query.limit,
    }),
  ]);

  return {
    data: patients.map(serializePatient),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getPatientDetail(id: string) {
  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    select: patientSelect,
  });

  if (!patient) {
    throw notFound("Patient not found");
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: id, deletedAt: null },
    include: appointmentInclude,
    orderBy: { appointmentDate: "desc" },
  });

  return serializePatientDetail(patient, appointments);
}

async function assertCinAvailable(cin: string, excludeId?: string): Promise<void> {
  const existing = await prisma.patient.findFirst({
    where: {
      cin,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw conflict("A patient with this CIN already exists");
  }
}

export async function createPatient(input: PatientCreateInput) {
  await assertCinAvailable(input.cin);

  const patient = await prisma.patient.create({
    data: {
      fullName: input.fullName,
      cin: input.cin,
      phone: input.phone,
      birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
      address: input.address ?? null,
    },
    select: patientSelect,
  });

  return serializePatient(patient);
}

export async function updatePatient(id: string, input: PatientUpdateInput) {
  const existing = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, cin: true },
  });

  if (!existing) {
    throw notFound("Patient not found");
  }

  if (input.cin && input.cin !== existing.cin) {
    await assertCinAvailable(input.cin, id);
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.cin !== undefined ? { cin: input.cin } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.birthDate !== undefined
        ? { birthDate: new Date(`${input.birthDate}T00:00:00.000Z`) }
        : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
    },
    select: patientSelect,
  });

  return serializePatient(patient);
}

/**
 * Soft-deletes the patient and cancels future active appointments in one
 * transaction. Appointment history is retained, never cascaded away.
 */
export async function softDeletePatient(id: string) {
  return prisma.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!patient) {
      throw notFound("Patient not found");
    }

    const deletedAt = new Date();

    await tx.patient.update({
      where: { id },
      data: { deletedAt },
    });

    await tx.appointment.updateMany({
      where: {
        patientId: id,
        deletedAt: null,
        status: { in: ["pending", "confirmed"] },
        appointmentDate: { gte: deletedAt },
      },
      data: { status: "cancelled" },
    });

    return { id, deletedAt: deletedAt.toISOString() };
  });
}

export async function findActivePatientForAppointment(patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true, fullName: true },
  });

  if (!patient) {
    throw notFound("Active patient not found");
  }

  return patient;
}
