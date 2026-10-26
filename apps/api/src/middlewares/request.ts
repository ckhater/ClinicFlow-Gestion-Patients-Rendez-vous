import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import { env } from "../config/env";
import { logger } from "../config/logger";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming && /^[A-Za-z0-9._-]{1,100}$/.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).requestId ?? randomUUID(),
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        // Query strings can contain patient names; only log the path.
        path: (req.url ?? "").split("?")[0],
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  autoLogging: {
    ignore: (req) => req.url === "/api/health",
  },
});

export const securityHeaders = {
  contentSecurityPolicy: env.isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      }
    : false,
  crossOriginResourcePolicy: { policy: "same-site" as const },
};
