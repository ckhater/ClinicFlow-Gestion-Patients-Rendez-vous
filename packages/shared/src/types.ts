import type {
  AppointmentStatus,
  Role,
} from "./constants";

/* -------------------------------------------------------------------------- */
/* Public API entities                                                        */
/* -------------------------------------------------------------------------- */

export interface UserPublic {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  fullName: string;
  cin: string;
  phone: string;
  birthDate: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  createdById: string;
  appointmentDate: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentPatientSummary {
  id: string;
  fullName: string;
  cin: string;
  phone: string;
  birthDate: string;
}

export interface AppointmentCreatorSummary {
  id: string;
  fullName: string;
  role: Role;
}

export interface AppointmentWithRelations extends Appointment {
  patient: AppointmentPatientSummary;
  createdBy: AppointmentCreatorSummary;
}

export interface PatientDetail extends Patient {
  appointments: AppointmentWithRelations[];
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface DashboardSummary {
  /** Active (not soft-deleted) patients. */
  totalActivePatients: number;
  /** Pending + confirmed appointments on the current clinic day. */
  todayAppointments: number;
  /** All non-deleted pending appointments (all dates). */
  pendingAppointments: number;
  /** All non-deleted confirmed appointments (all dates). */
  confirmedAppointments: number;
}

export interface StatusBreakdownItem {
  status: AppointmentStatus;
  count: number;
}

export interface WeeklyTrendPoint {
  /** Clinic-local calendar date, YYYY-MM-DD. */
  date: string;
  count: number;
}

export interface DashboardStats {
  summary: DashboardSummary;
  todaySchedule: AppointmentWithRelations[];
  upcoming: AppointmentWithRelations[];
  statusBreakdown: StatusBreakdownItem[];
  weeklyTrend: WeeklyTrendPoint[];
  generatedAt: string;
  timezone: string;
}

/* -------------------------------------------------------------------------- */
/* API envelopes                                                              */
/* -------------------------------------------------------------------------- */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ItemResponse<T> {
  data: T;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ValidationIssue[];
    requestId?: string;
  };
}

export interface HealthResponse {
  data: {
    status: "ok" | "degraded";
    database: "up" | "down";
    uptime: number;
    timestamp: string;
  };
}

export interface DeleteResponse {
  data: { id: string; deletedAt: string };
}
