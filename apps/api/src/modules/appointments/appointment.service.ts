import type { Prisma } from "@prisma/client";
import {
  canTransitionAppointmentStatus,
  normalizeCin,
  type AppointmentCreateInput,
  type AppointmentListQuery,
  type AppointmentStatus,
  type AppointmentUpdateInput,
} from "@clinic/shared";
import { prisma } from "../../lib/prisma";
import { notFound, unprocessable } from "../../utils/errors";
import { clinicDayRange } from "../../utils/datetime";
import { buildPaginationMeta, paginationSkip } from "../../utils/pagination";
import { appointmentInclude } from "../../utils/selectors";
import { serializeAppointment } from "../../utils/serializers";
import { findActivePatientForAppointment } from "../patients/patient.service";

export async function listAppointments(query: AppointmentListQuery) {
  const search = query.search?.trim();
  const where: Prisma.AppointmentWhereInput = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.date ? { appointmentDate: clinicDayRange(query.date) } : {}),
    ...(search
      ? {
          patient: {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { cin: { contains: normalizeCin(search), mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [total, appointments] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { appointmentDate: "asc" },
      skip: paginationSkip(query.page, query.limit),
      take: query.limit,
    }),
  ]);

  return {
    data: appointments.map(serializeAppointment),
    pagination: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getAppointment(id: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw notFound("Appointment not found");
  }

  return serializeAppointment(appointment);
}

export async function updateAppointment(id: string, input: AppointmentUpdateInput) {
  const existing = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, patientId: true, status: true },
  });

  if (!existing) {
    throw notFound("Appointment not found");
  }

  if (existing.status === "cancelled") {
    throw unprocessable("Cancelled appointments cannot be modified");
  }

  if (input.patientId && input.patientId !== existing.patientId) {
    await findActivePatientForAppointment(input.patientId);
  }

  let appointmentDate: Date | undefined;
  if (input.appointmentDate) {
    appointmentDate = new Date(input.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) {
      throw unprocessable("Appointment date is invalid");
    }
    if (appointmentDate.getTime() < Date.now()) {
      throw unprocessable("Appointment date cannot be in the past");
    }
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      ...(input.patientId !== undefined ? { patientId: input.patientId } : {}),
      ...(appointmentDate ? { appointmentDate } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: appointmentInclude,
  });

  return serializeAppointment(appointment);
}

/**
 * Archives an appointment without removing the row. Soft-deleted appointments
 * disappear from lists and dashboards while retaining their audit trail.
 */
export async function softDeleteAppointment(id: string) {
  const existing = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw notFound("Appointment not found");
  }

  const deletedAt = new Date();
  await prisma.appointment.update({
    where: { id },
    data: { deletedAt },
  });

  return { id, deletedAt: deletedAt.toISOString() };
}

export async function createAppointment(input: AppointmentCreateInput, createdById: string) {
  const patient = await findActivePatientForAppointment(input.patientId);
  const appointmentDate = new Date(input.appointmentDate);

  if (Number.isNaN(appointmentDate.getTime())) {
    throw unprocessable("Appointment date is invalid");
  }
  if (appointmentDate.getTime() < Date.now()) {
    throw unprocessable("Appointment date cannot be in the past");
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      createdById,
      appointmentDate,
      status: "pending",
      reason: input.reason ?? null,
      notes: input.notes ?? null,
    },
    include: appointmentInclude,
  });

  return serializeAppointment(appointment);
}

export async function updateAppointmentStatus(id: string, nextStatus: AppointmentStatus) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!appointment) {
    throw notFound("Appointment not found");
  }

  if (appointment.status === nextStatus) {
    throw unprocessable(`Appointment is already ${nextStatus}`);
  }

  if (!canTransitionAppointmentStatus(appointment.status, nextStatus)) {
    throw unprocessable(
      `Cannot change appointment status from ${appointment.status} to ${nextStatus}`,
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: nextStatus },
    include: appointmentInclude,
  });

  return serializeAppointment(updated);
}
