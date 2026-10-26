import { randomUUID } from "node:crypto";
import request from "supertest";
import type { Express } from "express";
import bcrypt from "bcryptjs";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "../src/lib/prisma";

export const TEST_PASSWORD = "Password123!";
export const CLINIC_TIMEZONE = "Africa/Casablanca";

export type TestAgent = ReturnType<typeof request.agent>;

export async function resetDatabase(): Promise<void> {
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedUsers() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  const admin = await prisma.user.create({
    data: {
      fullName: "Test Admin",
      email: "admin@test.clinic",
      passwordHash,
      role: "admin",
    },
  });
  const staff = await prisma.user.create({
    data: {
      fullName: "Test Staff",
      email: "staff@test.clinic",
      passwordHash,
      role: "staff",
    },
  });
  const otherStaff = await prisma.user.create({
    data: {
      fullName: "Other Staff",
      email: "other.staff@test.clinic",
      passwordHash,
      role: "staff",
    },
  });
  return { admin, staff, otherStaff, passwordHash };
}

export async function getCsrfToken(agent: TestAgent): Promise<string> {
  const response = await agent.get("/api/auth/csrf").expect(200);
  return (response.body as { data: { csrfToken: string } }).data.csrfToken;
}

export async function login(
  app: Express,
  email: string,
  password = TEST_PASSWORD,
): Promise<{ agent: TestAgent; csrfToken: string; response: request.Response }> {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  const response = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email, password });
  return { agent, csrfToken, response };
}

export async function createPatientRecord(overrides: Partial<{
  fullName: string;
  cin: string;
  phone: string;
  birthDate: Date;
  address: string | null;
}> = {}) {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return prisma.patient.create({
    data: {
      fullName: overrides.fullName ?? "Test Patient",
      cin: overrides.cin ?? `T${suffix}`,
      phone: overrides.phone ?? "+212 600 000 000",
      birthDate: overrides.birthDate ?? new Date("1990-05-15T00:00:00.000Z"),
      address: overrides.address ?? null,
    },
  });
}

export function futureDate(daysFromNow = 1, hour = 10): Date {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

export function clinicDateAt(date: string, time = "12:00"): Date {
  return fromZonedTime(`${date}T${time}:00`, CLINIC_TIMEZONE);
}

export function bodyOf<T>(response: request.Response): T {
  return response.body as T;
}
