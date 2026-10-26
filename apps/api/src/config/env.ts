import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { CLINIC_DEFAULTS } from "@clinic/shared";

// Support running from the repository root, from apps/api, or inside Docker.
const candidateEnvFiles = [
  process.env.ENV_FILE,
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
].filter((value): value is string => Boolean(value));

for (const file of candidateEnvFiles) {
  dotenv.config({ path: file });
}

const booleanFromString = z.preprocess(
  (value) => (value === undefined || value === null || value === "" ? "false" : value),
  z.enum(["true", "false"]).transform((value) => value === "true"),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_HOST: z.string().min(1).default("0.0.0.0"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET must be at least 32 characters long"),
    JWT_EXPIRES_IN: z.string().min(1).default("8h"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    COOKIE_SECURE: booleanFromString,
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
    CLINIC_TIMEZONE: z.string().min(1).default(CLINIC_DEFAULTS.TIMEZONE),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .superRefine((value, ctx) => {
    if (value.COOKIE_SAMESITE === "none" && !value.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "COOKIE_SAMESITE=none requires COOKIE_SECURE=true",
        path: ["COOKIE_SECURE"],
      });
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value.CLINIC_TIMEZONE });
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid CLINIC_TIMEZONE: ${value.CLINIC_TIMEZONE}`,
        path: ["CLINIC_TIMEZONE"],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // Fail fast: never boot with an invalid security configuration.
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${messages}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
};

export type Env = typeof env;
