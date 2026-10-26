-- Enable trigram search for case-insensitive partial patient lookup
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'staff');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'staff',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "cin" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "birth_date" DATE NOT NULL,
    "address" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "appointment_date" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "reason" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_cin_key" ON "patients"("cin");

-- CreateIndex
CREATE INDEX "patients_full_name_idx" ON "patients"("full_name");

-- CreateIndex
CREATE INDEX "patients_created_at_idx" ON "patients"("created_at");

-- CreateIndex
CREATE INDEX "patients_deleted_at_idx" ON "patients"("deleted_at");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_idx" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_status_idx" ON "appointments"("appointment_date", "status");

-- CreateIndex
CREATE INDEX "appointments_patient_id_appointment_date_idx" ON "appointments"("patient_id", "appointment_date");

-- CreateIndex
CREATE INDEX "appointments_created_by_id_idx" ON "appointments"("created_by_id");

-- CreateIndex
CREATE INDEX "appointments_deleted_at_idx" ON "appointments"("deleted_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Trigram indexes for patient search by partial name or CIN (ILIKE '%term%')
CREATE INDEX "patients_full_name_trgm_idx" ON "patients" USING GIN ("full_name" gin_trgm_ops);
CREATE INDEX "patients_cin_trgm_idx" ON "patients" USING GIN ("cin" gin_trgm_ops);

-- Canonicalization and data-integrity checks
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_full_name_not_blank_check" CHECK (length(btrim("full_name")) > 0);

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_cin_canonical_check" CHECK ("cin" = upper("cin") AND "cin" ~ '^[A-Z0-9]{5,20}$'),
  ADD CONSTRAINT "patients_full_name_not_blank_check" CHECK (length(btrim("full_name")) > 0),
  ADD CONSTRAINT "patients_birth_date_not_future_check" CHECK ("birth_date" <= CURRENT_DATE);

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_reason_length_check" CHECK ("reason" IS NULL OR char_length("reason") <= 255),
  ADD CONSTRAINT "appointments_notes_length_check" CHECK ("notes" IS NULL OR char_length("notes") <= 2000);
