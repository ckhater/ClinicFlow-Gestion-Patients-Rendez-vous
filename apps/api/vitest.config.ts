import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must be defined in .env");
}

const parsedUrl = new URL(testDatabaseUrl);

if (!/^\/[^/?]*_test$/.test(parsedUrl.pathname)) {
  throw new Error(
    "TEST_DATABASE_URL must point to a database whose name ends with _test",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  "test-only-jwt-secret-with-at-least-32-characters";
process.env.LOG_LEVEL = "silent";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAMESITE = "lax";
process.env.CLINIC_TIMEZONE = "Africa/Casablanca";
process.env.CORS_ORIGIN = "http://localhost:3000";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 120_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET:
        "test-only-jwt-secret-with-at-least-32-characters",
      LOG_LEVEL: "silent",
      COOKIE_SECURE: "false",
      COOKIE_SAMESITE: "lax",
      CLINIC_TIMEZONE: "Africa/Casablanca",
      CORS_ORIGIN: "http://localhost:3000",
      TZ: "UTC",
    },
  },
});