import { z } from "zod";
import {
  APPOINTMENT_STATUSES,
  PATIENT_SORT_FIELDS,
  PAGINATION,
  ROLES,
  USER_SORT_FIELDS,
} from "./constants";

/* -------------------------------------------------------------------------- */
/* Normalizers                                                                */
/* -------------------------------------------------------------------------- */

/** CIN is stored canonical: uppercase, internal whitespace removed. */
export function normalizeCin(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/* -------------------------------------------------------------------------- */
/* Primitive schemas                                                          */
/* -------------------------------------------------------------------------- */

export const uuidSchema = z.string().uuid("Must be a valid UUID");

export const roleSchema = z.enum(ROLES);
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

const fullNameSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeFullName(value) : value),
  z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name must be at most 120 characters")
    .regex(
      /^[\p{L}\p{M}' .-]+$/u,
      "Full name may only contain letters, spaces, apostrophes, dots, and hyphens",
    ),
);

const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeEmail(value) : value),
  z.string().min(1, "Email is required").email("Enter a valid email").max(254),
);

const cinSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeCin(value) : value),
  z
    .string()
    .min(5, "CIN must be at least 5 characters")
    .max(20, "CIN must be at most 20 characters")
    .regex(/^[A-Z0-9]+$/, "CIN may only contain letters and digits"),
);

const phoneSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string()
    .min(6, "Phone number is required")
    .max(30, "Phone number is too long")
    .regex(/^\+?[0-9][0-9\s().-]*$/, "Enter a valid phone number")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 6 && digits.length <= 15;
    }, "Phone number must contain between 6 and 15 digits"),
);

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z.string().max(max, message).nullable().optional(),
  );

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a digit");

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return date.getTime() <= Date.now();
  }, "Birth date cannot be in the future");

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT, `Limit cannot exceed ${PAGINATION.MAX_LIMIT}`)
    .default(PAGINATION.DEFAULT_LIMIT),
});

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72, "Password is too long"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

export const patientCreateSchema = z.object({
  fullName: fullNameSchema,
  cin: cinSchema,
  phone: phoneSchema,
  birthDate: dateOnlySchema,
  address: optionalText(255, "Address must be at most 255 characters"),
});
export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

export const patientUpdateSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    cin: cinSchema.optional(),
    phone: phoneSchema.optional(),
    birthDate: dateOnlySchema.optional(),
    address: optionalText(255, "Address must be at most 255 characters"),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;

export const patientListQuerySchema = paginationQuerySchema
  .extend({
    search: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().max(100, "Search term is too long").optional(),
    ),
    sortBy: z.enum(PATIENT_SORT_FIELDS).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((value) => !value.search || value.search.length !== 1, {
    message: "Search with at least 2 characters",
    path: ["search"],
  });
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Appointments                                                               */
/* -------------------------------------------------------------------------- */

export const appointmentCreateSchema = z.object({
  patientId: uuidSchema,
  appointmentDate: z
    .string()
    .datetime({ offset: true, message: "Appointment date must be an ISO-8601 instant" }),
  reason: optionalText(255, "Reason must be at most 255 characters"),
  notes: optionalText(2000, "Notes must be at most 2000 characters"),
});
export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;

export const appointmentStatusUpdateSchema = z.object({
  status: appointmentStatusSchema,
});
export type AppointmentStatusUpdateInput = z.infer<typeof appointmentStatusUpdateSchema>;

export const appointmentUpdateSchema = z
  .object({
    patientId: uuidSchema.optional(),
    appointmentDate: z
      .string()
      .datetime({ offset: true, message: "Appointment date must be an ISO-8601 instant" })
      .optional(),
    reason: optionalText(255, "Reason must be at most 255 characters"),
    notes: optionalText(2000, "Notes must be at most 2000 characters"),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>;

export const appointmentListQuerySchema = paginationQuerySchema.extend({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a valid calendar date")
    .optional(),
  status: appointmentStatusSchema.optional(),
  patientId: uuidSchema.optional(),
  search: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().max(100, "Search term is too long").optional(),
  ),
});
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export const userCreateSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.default("staff"),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const userListQuerySchema = paginationQuerySchema.extend({
  search: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().max(100, "Search term is too long").optional(),
  ),
  role: roleSchema.optional(),
  sortBy: z.enum(USER_SORT_FIELDS).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Route params                                                               */
/* -------------------------------------------------------------------------- */

export const idParamSchema = z.object({ id: uuidSchema });
export type IdParam = z.infer<typeof idParamSchema>;
