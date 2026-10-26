import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { formatInTimeZone } from "date-fns-tz";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  CLINIC_TIMEZONE,
  bodyOf,
  clinicDateAt,
  createPatientRecord,
  futureDate,
  login,
  resetDatabase,
  seedUsers,
} from "./helpers";

const app = createApp();

describe("Dashboard statistics", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
  });

  it("computes real aggregates from the database", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });
    const patientA = await createPatientRecord({ fullName: "Patient A", cin: "DASH0001" });
    const patientB = await createPatientRecord({ fullName: "Patient B", cin: "DASH0002" });
    const deletedPatient = await createPatientRecord({
      fullName: "Deleted Patient",
      cin: "DASH0003",
    });
    await prisma.patient.update({
      where: { id: deletedPatient.id },
      data: { deletedAt: new Date() },
    });

    const today = formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");

    await prisma.appointment.createMany({
      data: [
        {
          patientId: patientA.id,
          createdById: admin.id,
          appointmentDate: clinicDateAt(today, "09:00"),
          status: "pending",
        },
        {
          patientId: patientB.id,
          createdById: admin.id,
          appointmentDate: clinicDateAt(today, "10:00"),
          status: "confirmed",
        },
        {
          patientId: patientA.id,
          createdById: admin.id,
          appointmentDate: clinicDateAt(today, "11:00"),
          status: "cancelled",
        },
        {
          patientId: patientB.id,
          createdById: admin.id,
          appointmentDate: futureDate(2),
          status: "pending",
        },
        {
          patientId: patientA.id,
          createdById: admin.id,
          appointmentDate: futureDate(-3),
          status: "confirmed",
        },
      ],
    });

    const { agent } = await login(app, "admin@test.clinic");
    const response = await agent.get("/api/dashboard/stats").expect(200);

    const body = bodyOf<{
      data: {
        summary: {
          totalActivePatients: number;
          todayAppointments: number;
          pendingAppointments: number;
          confirmedAppointments: number;
        };
        todaySchedule: unknown[];
        statusBreakdown: Array<{ status: string; count: number }>;
        weeklyTrend: Array<{ date: string; count: number }>;
        timezone: string;
      };
    }>(response);

    expect(body.data.summary).toEqual({
      totalActivePatients: 2,
      todayAppointments: 2,
      pendingAppointments: 2,
      confirmedAppointments: 2,
    });
    expect(body.data.todaySchedule).toHaveLength(2);
    expect(body.data.statusBreakdown).toEqual([
      { status: "pending", count: 2 },
      { status: "confirmed", count: 2 },
      { status: "cancelled", count: 1 },
    ]);
    expect(body.data.weeklyTrend).toHaveLength(7);
    expect(body.data.weeklyTrend.at(-1)?.date).toBe(today);
    expect(body.data.weeklyTrend.at(-1)?.count).toBe(3);
    expect(body.data.timezone).toBe(CLINIC_TIMEZONE);
  });

  it("requires authentication", async () => {
    await request(app).get("/api/dashboard/stats").expect(401);
  });
});
