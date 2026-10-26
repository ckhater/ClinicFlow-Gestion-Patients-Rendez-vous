export const ROLES = ["admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * The only status transitions accepted by the API. The map is shared so the UI
 * can only offer actions the backend will accept.
 */
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function canTransitionAppointmentStatus(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return APPOINTMENT_STATUS_TRANSITIONS[from].includes(to);
}

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const CLINIC_DEFAULTS = {
  TIMEZONE: "Africa/Casablanca",
} as const;

export const PATIENT_SORT_FIELDS = ["fullName", "createdAt", "birthDate"] as const;
export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number];

export const USER_SORT_FIELDS = ["fullName", "createdAt", "role"] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];
