import type {
  AppointmentWithRelations,
  Patient,
  PatientDetail,
  UserPublic,
} from "@clinic/shared";
import type {
  AppointmentRecord,
  PatientRecord,
  UserRecord,
} from "./selectors";

export function serializeUser(user: UserRecord): UserPublic {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function serializePatient(patient: PatientRecord): Patient {
  return {
    id: patient.id,
    fullName: patient.fullName,
    cin: patient.cin,
    phone: patient.phone,
    birthDate: patient.birthDate.toISOString().slice(0, 10),
    address: patient.address,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

export function serializeAppointment(appointment: AppointmentRecord): AppointmentWithRelations {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    createdById: appointment.createdById,
    appointmentDate: appointment.appointmentDate.toISOString(),
    status: appointment.status,
    reason: appointment.reason,
    notes: appointment.notes,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    patient: {
      id: appointment.patient.id,
      fullName: appointment.patient.fullName,
      cin: appointment.patient.cin,
      phone: appointment.patient.phone,
      birthDate: appointment.patient.birthDate.toISOString().slice(0, 10),
    },
    createdBy: {
      id: appointment.createdBy.id,
      fullName: appointment.createdBy.fullName,
      role: appointment.createdBy.role,
    },
  };
}

export function serializePatientDetail(
  patient: PatientRecord,
  appointments: AppointmentRecord[],
): PatientDetail {
  return {
    ...serializePatient(patient),
    appointments: appointments.map(serializeAppointment),
  };
}
