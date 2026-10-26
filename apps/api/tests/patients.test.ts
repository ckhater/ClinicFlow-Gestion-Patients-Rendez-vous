import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  bodyOf,
  createPatientRecord,
  futureDate,
  login,
  resetDatabase,
  seedUsers,
} from "./helpers";

const app = createApp();

const validPatient = {
  fullName: "Nadia El Mansouri",
  cin: "ab 998877",
  phone: "+212 611 222 333",
  birthDate: "1992-04-18",
  address: "10 Rue de la Paix, Fes",
};

describe("Patient management", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUsers();
  });

  it("creates a patient with a normalized CIN", async () => {
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    const response = await agent
      .post("/api/patients")
      .set("X-CSRF-Token", csrfToken)
      .send(validPatient);

    expect(response.status).toBe(201);
    const body = bodyOf<{ data: { id: string; cin: string; fullName: string } }>(response);
    expect(body.data.cin).toBe("AB998877");
    expect(body.data.fullName).toBe("Nadia El Mansouri");

    const stored = await prisma.patient.findUnique({ where: { id: body.data.id } });
    expect(stored?.cin).toBe("AB998877");
  });

  it("rejects a duplicate CIN after normalization", async () => {
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    await agent
      .post("/api/patients")
      .set("X-CSRF-Token", csrfToken)
      .send(validPatient)
      .expect(201);

    const duplicate = await agent
      .post("/api/patients")
      .set("X-CSRF-Token", csrfToken)
      .send({ ...validPatient, cin: "AB998877" });

    expect(duplicate.status).toBe(409);
    expect(bodyOf<{ error: { code: string } }>(duplicate).error.code).toBe("CONFLICT");
  });

  it("searches and paginates on the server", async () => {
    await prisma.patient.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        fullName: `Alpha Patient ${String(index + 1).padStart(2, "0")}`,
        cin: `ALPHA${String(index + 1).padStart(3, "0")}`,
        phone: "+212 600 111 222",
        birthDate: new Date("1985-01-01T00:00:00.000Z"),
      })),
    });
    await createPatientRecord({ fullName: "Beta Person", cin: "BETA0001" });

    const { agent } = await login(app, "staff@test.clinic");
    const response = await agent
      .get("/api/patients")
      .query({ search: "alpha", page: 2, limit: 5 })
      .expect(200);

    const body = bodyOf<{
      data: Array<{ fullName: string }>;
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(response);

    expect(body.data).toHaveLength(5);
    expect(body.pagination).toEqual({ total: 12, page: 2, limit: 5, totalPages: 3 });
    expect(body.data.every((patient) => patient.fullName.startsWith("Alpha"))).toBe(true);

    const cinSearch = await agent
      .get("/api/patients")
      .query({ search: "BETA0001" })
      .expect(200);
    expect(bodyOf<{ pagination: { total: number } }>(cinSearch).pagination.total).toBe(1);
  });

  it("updates patient details and can clear the optional address", async () => {
    const patient = await createPatientRecord({ address: "Old address" });
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const response = await agent
      .put(`/api/patients/${patient.id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({ phone: "+212 699 888 777", address: "" })
      .expect(200);

    const body = bodyOf<{ data: { phone: string; address: string | null } }>(response);
    expect(body.data.phone).toBe("+212 699 888 777");
    expect(body.data.address).toBeNull();
  });

  it("forbids staff from deleting patients", async () => {
    const patient = await createPatientRecord();
    const { agent, csrfToken } = await login(app, "staff@test.clinic");

    const response = await agent
      .delete(`/api/patients/${patient.id}`)
      .set("X-CSRF-Token", csrfToken);

    expect(response.status).toBe(403);
    const stored = await prisma.patient.findUnique({ where: { id: patient.id } });
    expect(stored?.deletedAt).toBeNull();
  });

  it("lets admins soft-delete a patient, hides them, and cancels future appointments", async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });
    const patient = await createPatientRecord();
    const future = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        createdById: admin.id,
        appointmentDate: futureDate(3),
        status: "confirmed",
        reason: "Follow-up",
      },
    });
    const { agent, csrfToken } = await login(app, "admin@test.clinic");

    await agent
      .delete(`/api/patients/${patient.id}`)
      .set("X-CSRF-Token", csrfToken)
      .expect(200);

    const stored = await prisma.patient.findUnique({ where: { id: patient.id } });
    expect(stored?.deletedAt).not.toBeNull();

    await agent.get(`/api/patients/${patient.id}`).expect(404);
    const list = await agent.get("/api/patients").query({ search: patient.cin }).expect(200);
    expect(bodyOf<{ pagination: { total: number } }>(list).pagination.total).toBe(0);

    const appointment = await prisma.appointment.findUnique({ where: { id: future.id } });
    expect(appointment?.status).toBe("cancelled");
  });

  it("validates malformed UUIDs and unsupported pagination limits", async () => {
    const { agent } = await login(app, "staff@test.clinic");
    const malformed = await agent.get("/api/patients/not-a-uuid");
    expect(malformed.status).toBe(400);

    const badLimit = await agent.get("/api/patients").query({ limit: 1000 });
    expect(badLimit.status).toBe(400);
    expect(bodyOf<{ error: { code: string } }>(badLimit).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid patient data", async () => {
    const { agent, csrfToken } = await login(app, "staff@test.clinic");
    const response = await agent
      .post("/api/patients")
      .set("X-CSRF-Token", csrfToken)
      .send({ ...validPatient, fullName: "A", birthDate: "2999-01-01", phone: "12" });

    expect(response.status).toBe(400);
    const body = bodyOf<{ error: { details: Array<{ path: string }> } }>(response);
    expect(body.error.details.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["fullName", "birthDate", "phone"]),
    );
  });
});
