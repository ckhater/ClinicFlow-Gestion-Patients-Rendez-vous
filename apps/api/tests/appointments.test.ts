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

describe("Appointment management", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
  });

  it("creates a pending appointment for an active patient", async () => {
    const patient = await createPatientRecord();
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    const appointmentDate = futureDate(2).toISOString();

    const response = await agent
      .post("/api/appointments")
      .set("X-CSRF-Token", csrfToken)
      .send({
        patientId: patient.id,
        appointmentDate,
        reason: "Initial consultation",
        notes: "Internal note",
      });

    expect(response.status).toBe(201);
    const body = bodyOf<{
      data: {
        status: string;
        appointmentDate: string;
        patient: { id: string };
        createdBy: { id: string };
      };
    }>(response);
    expect(body.data.status).toBe("pending");
    expect(body.data.appointmentDate).toBe(appointmentDate);
    expect(body.data.patient.id).toBe(patient.id);
  });

  it("rejects invalid status values at the validation layer", async () => {
    const patient = await createPatientRecord();
    const creator = await prisma.user.findFirstOrThrow({ where: { role: "staff" } });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: creator.id,
        appointmentDate: futureDate(1),
        status: "pending",
      },
    });
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const response = await agent
      .patch(`/api/appointments/${appointment.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "rescheduled" });

    expect(response.status).toBe(400);
    expect(bodyOf<{ error: { code: string } }>(response).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("enforces the documented status transition rules", async () => {
    const patient = await createPatientRecord();
    const creator = await prisma.user.findFirstOrThrow({ where: { role: "staff" } });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: creator.id,
        appointmentDate: futureDate(1),
        status: "pending",
      },
    });
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const confirmed = await agent
      .patch(`/api/appointments/${appointment.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "confirmed" })
      .expect(200);
    expect(bodyOf<{ data: { status: string } }>(confirmed).data.status).toBe("confirmed");

    const cancelled = await agent
      .patch(`/api/appointments/${appointment.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "cancelled" })
      .expect(200);
    expect(bodyOf<{ data: { status: string } }>(cancelled).data.status).toBe("cancelled");

    const invalid = await agent
      .patch(`/api/appointments/${appointment.id}/status`)
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "confirmed" });
    expect(invalid.status).toBe(422);
    expect(bodyOf<{ error: { code: string } }>(invalid).error.code).toBe(
      "UNPROCESSABLE_ENTITY",
    );
  });

  it("filters appointments by clinic date and status", async () => {
    const patient = await createPatientRecord();
    const creator = await prisma.user.findFirstOrThrow({ where: { role: "staff" } });
    const today = formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");
    const tomorrow = formatInTimeZone(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      CLINIC_TIMEZONE,
      "yyyy-MM-dd",
    );

    await prisma.appointment.createMany({
      data: [
        {
          patientId: patient.id,
          createdById: creator.id,
          appointmentDate: clinicDateAt(today, "09:00"),
          status: "confirmed",
          reason: "Today confirmed",
        },
        {
          patientId: patient.id,
          createdById: creator.id,
          appointmentDate: clinicDateAt(today, "11:00"),
          status: "pending",
          reason: "Today pending",
        },
        {
          patientId: patient.id,
          createdById: creator.id,
          appointmentDate: clinicDateAt(tomorrow, "09:00"),
          status: "confirmed",
          reason: "Tomorrow confirmed",
        },
      ],
    });

    const { agent } = await login(app, "staff@test.clinic");

    const todayResponse = await agent
      .get("/api/appointments")
      .query({ date: today })
      .expect(200);
    expect(bodyOf<{ pagination: { total: number } }>(todayResponse).pagination.total).toBe(2);

    const confirmedToday = await agent
      .get("/api/appointments")
      .query({ date: today, status: "confirmed" })
      .expect(200);
    const confirmedBody = bodyOf<{ data: Array<{ reason: string }> }>(confirmedToday);
    expect(confirmedBody.data).toHaveLength(1);
    expect(confirmedBody.data[0]?.reason).toBe("Today confirmed");
  });

  it("refuses appointments for soft-deleted patients and dates in the past", async () => {
    const patient = await createPatientRecord();
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const past = await agent
      .post("/api/appointments")
      .set("X-CSRF-Token", csrfToken)
      .send({
        patientId: patient.id,
        appointmentDate: new Date(Date.now() - 60_000).toISOString(),
      });
    expect(past.status).toBe(422);

    await prisma.patient.update({
      where: { id: patient.id },
      data: { deletedAt: new Date() },
    });

    const deletedPatient = await agent
      .post("/api/appointments")
      .set("X-CSRF-Token", csrfToken)
      .send({
        patientId: patient.id,
        appointmentDate: futureDate(1).toISOString(),
      });
    expect(deletedPatient.status).toBe(404);
  });

  it("updates an active appointment's schedule and details", async () => {
    const patient = await createPatientRecord();
    const otherPatient = await createPatientRecord({ fullName: "Other Patient" });
    const creator = await prisma.user.findFirstOrThrow({ where: { role: "staff" } });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: creator.id,
        appointmentDate: futureDate(2),
        status: "pending",
        reason: "Original reason",
      },
    });
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    const newDate = futureDate(4).toISOString();

    const response = await agent
      .put(`/api/appointments/${appointment.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({
        patientId: otherPatient.id,
        appointmentDate: newDate,
        reason: "Updated reason",
        notes: "Bring test results",
      })
      .expect(200);

    const body = bodyOf<{
      data: {
        appointmentDate: string;
        reason: string;
        notes: string;
        patient: { id: string };
        status: string;
      };
    }>(response);
    expect(body.data.appointmentDate).toBe(newDate);
    expect(body.data.reason).toBe("Updated reason");
    expect(body.data.notes).toBe("Bring test results");
    expect(body.data.patient.id).toBe(otherPatient.id);
    expect(body.data.status).toBe("pending");
  });

  it("rejects updates for cancelled appointments and past dates", async () => {
    const patient = await createPatientRecord();
    const creator = await prisma.user.findFirstOrThrow({ where: { role: "staff" } });
    const cancelled = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: creator.id,
        appointmentDate: futureDate(2),
        status: "cancelled",
      },
    });
    const active = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: creator.id,
        appointmentDate: futureDate(2),
        status: "pending",
      },
    });
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const cancelledResponse = await agent
      .put(`/api/appointments/${cancelled.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ reason: "Too late" });
    expect(cancelledResponse.status).toBe(422);

    const pastResponse = await agent
      .put(`/api/appointments/${active.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ appointmentDate: new Date(Date.now() - 60_000).toISOString() });
    expect(pastResponse.status).toBe(422);

    const emptyResponse = await agent
      .put(`/api/appointments/${active.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({});
    expect(emptyResponse.status).toBe(400);
  });

  it("allows only admins to archive appointments and hides them everywhere", async () => {
    const patient = await createPatientRecord();
    const creator = await prisma.user.findFirstOrThrow({ where: { role: "staff" } });
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: creator.id,
        appointmentDate: futureDate(1),
        status: "pending",
        reason: "To archive",
      },
    });

    const staffSession = await login(app, "staff@test.clinic");
    const staffResponse = await staffSession.agent
      .delete(`/api/appointments/${appointment.id}`)
      .set("X-CSRF-Token", staffSession.csrfToken);
    expect(staffResponse.status).toBe(403);

    const adminSession = await login(app, "admin@test.clinic");
    const adminResponse = await adminSession.agent
      .delete(`/api/appointments/${appointment.id}`)
      .set("X-CSRF-Token", adminSession.csrfToken)
      .expect(200);
    const archived = bodyOf<{ data: { id: string; deletedAt: string } }>(adminResponse);
    expect(archived.data.id).toBe(appointment.id);
    expect(archived.data.deletedAt).toBeTruthy();

    const listResponse = await adminSession.agent.get("/api/appointments").expect(200);
    expect(bodyOf<{ pagination: { total: number } }>(listResponse).pagination.total).toBe(0);

    const detailResponse = await adminSession.agent.get(`/api/appointments/${appointment.id}`);
    expect(detailResponse.status).toBe(404);

    const dashboardResponse = await adminSession.agent.get("/api/dashboard/stats").expect(200);
    const dashboard = bodyOf<{
      data: {
        summary: { pendingAppointments: number };
        statusBreakdown: Array<{ status: string; count: number }>;
      };
    }>(dashboardResponse);
    expect(dashboard.data.summary.pendingAppointments).toBe(0);
    expect(
      dashboard.data.statusBreakdown.find((item) => item.status === "pending")?.count,
    ).toBe(0);

    const stored = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
    });
    expect(stored.deletedAt).not.toBeNull();
  });

  it("requires authentication and validates patient UUIDs", async () => {
    await request(app).get("/api/appointments").expect(401);
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    const response = await agent
      .post("/api/appointments")
      .set("X-CSRF-Token", csrfToken)
      .send({ patientId: "not-a-uuid", appointmentDate: futureDate(1).toISOString() });
    expect(response.status).toBe(400);
  });
});
