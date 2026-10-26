import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { csrfProtection } from "./middlewares/csrf";
import { generalRateLimiter } from "./middlewares/rate-limit";
import {
  requestIdMiddleware,
  requestLogger,
  securityHeaders,
} from "./middlewares/request";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { AppError } from "./utils/errors";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(requestLogger);
  app.use(helmet(securityHeaders));
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests and non-browser clients send no Origin header.
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, "CORS_ORIGIN_DENIED", "Origin is not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy"],
      maxAge: 86400,
    }),
  );
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use(express.json({ limit: "100kb" }));
  app.use(generalRateLimiter);

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
