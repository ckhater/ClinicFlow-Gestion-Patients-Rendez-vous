import type { Prisma } from "@prisma/client";

export const userPublicSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const patientSelect = {
  id: true,
  fullName: true,
  cin: true,
  phone: true,
  birthDate: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

export const appointmentPatientSelect = {
  id: true,
  fullName: true,
  cin: true,
  phone: true,
  birthDate: true,
} satisfies Prisma.PatientSelect;

export const appointmentCreatorSelect = {
  id: true,
  fullName: true,
  role: true,
} satisfies Prisma.UserSelect;

export const appointmentInclude = {
  patient: { select: appointmentPatientSelect },
  createdBy: { select: appointmentCreatorSelect },
} satisfies Prisma.AppointmentInclude;

export type UserRecord = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
export type PatientRecord = Prisma.PatientGetPayload<{ select: typeof patientSelect }>;
export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;
