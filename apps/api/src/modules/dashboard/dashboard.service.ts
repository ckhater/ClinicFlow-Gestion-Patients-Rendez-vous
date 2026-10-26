import {
  type AppointmentStatus,
  type DashboardStats,
  type StatusBreakdownItem,
} from "@clinic/shared";
import { prisma } from "../../lib/prisma";
import {
  CLINIC_TIMEZONE,
  clinicDayRange,
  lastClinicDates,
  todayInClinicTimezone,
} from "../../utils/datetime";
import { appointmentInclude } from "../../utils/selectors";
import { serializeAppointment } from "../../utils/serializers";

export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  const today = todayInClinicTimezone(now);
  const todayRange = clinicDayRange(today);
  const weekDates = lastClinicDates(7, now);

  const [
    totalActivePatients,
    todayAppointments,
    pendingAppointments,
    confirmedAppointments,
    cancelledAppointments,
    todaySchedule,
    upcoming,
  ] = await prisma.$transaction([
    prisma.patient.count({ where: { deletedAt: null } }),
    prisma.appointment.count({
      where: {
        deletedAt: null,
        appointmentDate: todayRange,
        status: { in: ["pending", "confirmed"] },
      },
    }),
    prisma.appointment.count({ where: { deletedAt: null, status: "pending" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "confirmed" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "cancelled" } }),
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        appointmentDate: todayRange,
        status: { in: ["pending", "confirmed"] },
      },
      include: appointmentInclude,
      orderBy: { appointmentDate: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        appointmentDate: { gte: now },
        status: { in: ["pending", "confirmed"] },
      },
      include: appointmentInclude,
      orderBy: { appointmentDate: "asc" },
      take: 5,
    }),
  ]);

  const weeklyCounts = await Promise.all(
    weekDates.map((date) =>
      prisma.appointment.count({
        where: {
          deletedAt: null,
          appointmentDate: clinicDayRange(date),
        },
      }),
    ),
  );

  const statusCounts: Record<AppointmentStatus, number> = {
    pending: pendingAppointments,
    confirmed: confirmedAppointments,
    cancelled: cancelledAppointments,
  };

  const statusBreakdown: StatusBreakdownItem[] = (
    ["pending", "confirmed", "cancelled"] as const
  ).map((status) => ({
    status,
    count: statusCounts[status],
  }));

  const weeklyTrend = weekDates.map((date, index) => ({
    date,
    count: weeklyCounts[index] ?? 0,
  }));

  return {
    summary: {
      totalActivePatients,
      todayAppointments,
      pendingAppointments,
      confirmedAppointments,
    },
    todaySchedule: todaySchedule.map(serializeAppointment),
    upcoming: upcoming.map(serializeAppointment),
    statusBreakdown,
    weeklyTrend,
    generatedAt: now.toISOString(),
    timezone: CLINIC_TIMEZONE,
  };
}
