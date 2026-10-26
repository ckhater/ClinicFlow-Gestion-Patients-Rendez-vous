import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.API_PORT, env.API_HOST, () => {
  logger.info(
    {
      port: env.API_PORT,
      host: env.API_HOST,
      environment: env.NODE_ENV,
      timezone: env.CLINIC_TIMEZONE,
    },
    "ClinicFlow API listening",
  );
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down API");
  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "Error while closing HTTP server");
    }
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.error({ err: disconnectError }, "Error while disconnecting Prisma");
    }
    process.exit(error ? 1 : 0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});
