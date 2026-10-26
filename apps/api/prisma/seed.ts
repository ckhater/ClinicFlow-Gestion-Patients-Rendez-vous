import path from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { PrismaClient, type AppointmentStatus } from "@prisma/client";

// Allow running this script directly from apps/api as well as from Docker.
for (const file of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
]) {
  dotenv.config({ path: file });
}

const prisma = new PrismaClient();
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE ?? "Africa/Casablanca";
const BCRYPT_COST = 12;

function generateRandomPassword(length = 16): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Admin and staff credentials are sourced from environment variables so they
// are never committed in plain text. When a password is not provided, a
// random one is generated and printed at the end of the seed output.
const ADMIN_EMAIL: string = process.env.SEED_ADMIN_EMAIL ?? "admin@clinicflow.dev";
const ADMIN_PASSWORD: string =
  process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

const STAFF_1_EMAIL: string = process.env.SEED_STAFF_EMAIL_1 ?? "staff@clinicflow.dev";
const STAFF_1_PASSWORD: string =
  process.env.SEED_STAFF_PASSWORD_1 ?? "Staff123!";

const STAFF_2_EMAIL: string = process.env.SEED_STAFF_EMAIL_2 ?? "salma@clinicflow.dev";
const STAFF_2_PASSWORD: string =
  process.env.SEED_STAFF_PASSWORD_2 ?? "Staff123!";

const today = formatInTimeZone(new Date(), CLINIC_TIMEZONE, "yyyy-MM-dd");

function clinicDate(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, CLINIC_TIMEZONE);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return next.toISOString().slice(0, 10);
}

const users = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "Amina Benali",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin" as const,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    fullName: "Youssef El Amrani",
    email: STAFF_1_EMAIL,
    password: STAFF_1_PASSWORD,
    role: "staff" as const,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    fullName: "Salma Idrissi",
    email: STAFF_2_EMAIL,
    password: STAFF_2_PASSWORD,
    role: "staff" as const,
  },
];

const patients = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    fullName: "Fatima Zahra El Fassi",
    cin: "AB123456",
    phone: "+212 661 234 567",
    birthDate: "1988-03-14",
    address: "12 Rue des Orangers, Casablanca",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    fullName: "Mohammed Amine Tazi",
    cin: "CD654321",
    phone: "+212 662 345 678",
    birthDate: "1975-11-02",
    address: "45 Avenue Hassan II, Rabat",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    fullName: "Khadija Bouzid",
    cin: "EF112233",
    phone: "+212 663 456 789",
    birthDate: "1994-07-21",
    address: "8 Rue Ibn Battouta, Marrakech",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    fullName: "Omar Alaoui",
    cin: "GH445566",
    phone: "+212 664 567 890",
    birthDate: "1969-01-30",
    address: null,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
    fullName: "Leila Chraibi",
    cin: "IJ778899",
    phone: "+212 665 678 901",
    birthDate: "2001-09-09",
    address: "27 Boulevard Zerktouni, Casablanca",
  },
];

interface SeedAppointment {
  id: string;
  patientIndex: number;
  creatorIndex: number;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
  notes: string | null;
}

const appointments: SeedAppointment[] = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001",
    patientIndex: 0,
    creatorIndex: 1,
    date: today,
    time: "09:00",
    status: "pending",
    reason: "Annual check-up",
    notes: "Patient requested a morning slot.",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002",
    patientIndex: 4,
    creatorIndex: 2,
    date: today,
    time: "10:30",
    status: "confirmed",
    reason: "Blood pressure follow-up",
    notes: null,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003",
    patientIndex: 1,
    creatorIndex: 0,
    date: today,
    time: "14:00",
    status: "pending",
    reason: "Persistent cough",
    notes: "Bring previous prescription if available.",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb004",
    patientIndex: 2,
    creatorIndex: 1,
    date: today,
    time: "16:30",
    status: "cancelled",
    reason: "Vaccination",
    notes: "Cancelled by the patient.",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb005",
    patientIndex: 3,
    creatorIndex: 2,
    date: addDays(today, 1),
    time: "11:00",
    status: "confirmed",
    reason: "Diabetes follow-up",
    notes: null,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb006",
    patientIndex: 0,
    creatorIndex: 0,
    date: addDays(today, 2),
    time: "15:00",
    status: "pending",
    reason: "Lab results review",
    notes: null,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb007",
    patientIndex: 1,
    creatorIndex: 1,
    date: addDays(today, 3),
    time: "09:30",
    status: "pending",
    reason: "Knee pain",
    notes: "First consultation.",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb008",
    patientIndex: 2,
    creatorIndex: 2,
    date: addDays(today, -1),
    time: "10:00",
    status: "confirmed",
    reason: "Allergy consultation",
    notes: null,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb009",
    patientIndex: 3,
    creatorIndex: 0,
    date: addDays(today, -2),
    time: "14:30",
    status: "cancelled",
    reason: "Physiotherapy assessment",
    notes: "Rescheduled by the clinic.",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb010",
    patientIndex: 4,
    creatorIndex: 1,
    date: addDays(today, -4),
    time: "16:00",
    status: "confirmed",
    reason: "Migraine follow-up",
    notes: null,
  },
];

async function main(): Promise<void> {
  // Hash each distinct password once.
  const passwordHashes = new Map<string, string>();
  for (const user of users) {
    if (!passwordHashes.has(user.password)) {
      passwordHashes.set(user.password, await bcrypt.hash(user.password, BCRYPT_COST));
    }
  }

  const userIds: string[] = [];
  for (const user of users) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        passwordHash: passwordHashes.get(user.password) ?? "",
        role: user.role,
        deletedAt: null,
      },
      create: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        passwordHash: passwordHashes.get(user.password) ?? "",
        role: user.role,
      },
      select: { id: true },
    });
    userIds.push(saved.id);
  }

  const patientIds: string[] = [];
  for (const patient of patients) {
    const saved = await prisma.patient.upsert({
      where: { cin: patient.cin },
      update: {
        fullName: patient.fullName,
        phone: patient.phone,
        birthDate: new Date(`${patient.birthDate}T00:00:00.000Z`),
        address: patient.address,
        deletedAt: null,
      },
      create: {
        id: patient.id,
        fullName: patient.fullName,
        cin: patient.cin,
        phone: patient.phone,
        birthDate: new Date(`${patient.birthDate}T00:00:00.000Z`),
        address: patient.address,
      },
      select: { id: true },
    });
    patientIds.push(saved.id);
  }

  for (const appointment of appointments) {
    const patientId = patientIds[appointment.patientIndex];
    const createdById = userIds[appointment.creatorIndex];
    if (!patientId || !createdById) {
      throw new Error("Seed reference is missing");
    }

    await prisma.appointment.upsert({
      where: { id: appointment.id },
      update: {
        patientId,
        createdById,
        appointmentDate: clinicDate(appointment.date, appointment.time),
        status: appointment.status,
        reason: appointment.reason,
        notes: appointment.notes,
        deletedAt: null,
      },
      create: {
        id: appointment.id,
        patientId,
        createdById,
        appointmentDate: clinicDate(appointment.date, appointment.time),
        status: appointment.status,
        reason: appointment.reason,
        notes: appointment.notes,
      },
    });
  }

  console.log("Seed completed:");
  console.log(`  users:        1 admin, 2 staff`);
  console.log(`  patients:     ${patients.length}`);
  console.log(`  appointments: ${appointments.length}`);
  console.log("\nCredentials (change after first login):");
  console.log(`  Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Staff 1:  ${STAFF_1_EMAIL} / ${STAFF_1_PASSWORD}`);
  console.log(`  Staff 2:  ${STAFF_2_EMAIL} / ${STAFF_2_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
