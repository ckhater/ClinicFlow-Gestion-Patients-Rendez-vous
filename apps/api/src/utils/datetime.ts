import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { env } from "../config/env";

export const CLINIC_TIMEZONE = env.CLINIC_TIMEZONE;

/** Current clinic-local calendar date, e.g. "2026-10-27". */
export function todayInClinicTimezone(now: Date = new Date()): string {
  return formatInTimeZone(now, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function toClinicDateString(instant: Date): string {
  return formatInTimeZone(instant, CLINIC_TIMEZONE, "yyyy-MM-dd");
}

export function formatClinicDateTime(instant: Date): string {
  return formatInTimeZone(instant, CLINIC_TIMEZONE, "yyyy-MM-dd HH:mm");
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date string: ${date}`);
  }
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/**
 * Converts a clinic-local calendar date into a half-open UTC instant range:
 * [start, end). DST-safe because each boundary is interpreted independently.
 */
export function clinicDayRange(date: string): { gte: Date; lt: Date } {
  const nextDate = addDaysToDateString(date, 1);
  return {
    gte: fromZonedTime(`${date}T00:00:00`, CLINIC_TIMEZONE),
    lt: fromZonedTime(`${nextDate}T00:00:00`, CLINIC_TIMEZONE),
  };
}

/** The last `count` clinic-local dates, oldest first, including today. */
export function lastClinicDates(count: number, now: Date = new Date()): string[] {
  const today = todayInClinicTimezone(now);
  return Array.from({ length: count }, (_, index) =>
    addDaysToDateString(today, index - (count - 1)),
  );
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
