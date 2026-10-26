import { differenceInYears } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { AppointmentStatus, Role } from "@clinic/shared";

export const CLINIC_TIMEZONE =
  process.env.NEXT_PUBLIC_CLINIC_TIMEZONE ?? "Africa/Casablanca";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  staff: "Staff",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDateOnly(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateOnly;
  // Birth dates are calendar values, not instants: format in UTC so the day
  // never shifts with the viewer's browser timezone.
  return formatInTimeZone(date, "UTC", "d MMM yyyy");
}

export function calculateAge(dateOnly: string): number | null {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(`${formatClinicToday()}T00:00:00.000Z`);
  return differenceInYears(today, date);
}

export function formatClinicDate(iso: string): string {
  return formatInTimeZone(new Date(iso), CLINIC_TIMEZONE, "EEE d MMM yyyy");
}

export function formatClinicTime(iso: string): string {
  return formatInTimeZone(new Date(iso), CLINIC_TIMEZONE, "HH:mm");
}

export function formatClinicDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), CLINIC_TIMEZONE, "d MMM yyyy · HH:mm");
}

export function formatClinicLongDate(date: Date = new Date()): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, "EEEE d MMMM yyyy");
}

export function formatClinicToday(): string {
  return formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
}

/** Converts a UTC ISO instant to a clinic-local datetime-local input value. */
export function toClinicLocalInputValue(iso: string): string {
  return formatInTimeZone(new Date(iso), CLINIC_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/** Interprets a datetime-local value in the clinic timezone and returns UTC ISO. */
export function clinicLocalInputToIso(value: string): string {
  return fromZonedTime(value, CLINIC_TIMEZONE).toISOString();
}

export function defaultAppointmentInputValue(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return formatInTimeZone(tomorrow, CLINIC_TIMEZONE, "yyyy-MM-dd'T'09:00");
}

/** Current clinic-local date and time, suitable for a datetime-local `min`. */
export function currentClinicInputValue(): string {
  return formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function getGreeting(): string {
  const hour = Number(formatInTimeZone(new Date(), CLINIC_TIMEZONE, "H"));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
