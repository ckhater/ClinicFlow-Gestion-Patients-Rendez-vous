import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/errors";
import { validationError } from "./validate";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.path} was not found`,
      requestId: req.requestId,
    },
  });
}

function prismaErrorToAppError(error: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (error.code) {
    case "P2002": {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(", ")
        : "unique field";
      return new AppError(409, "CONFLICT", `A record with this ${target} already exists`);
    }
    case "P2003":
      return new AppError(
        409,
        "RELATION_CONFLICT",
        "This operation conflicts with related records",
      );
    case "P2025":
      return new AppError(404, "NOT_FOUND", "Resource not found");
    default:
      return null;
  }
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = validationError(error);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = prismaErrorToAppError(error) ?? new AppError(500, "DATABASE_ERROR", "Database error");
  } else if (
    error instanceof SyntaxError &&
    "body" in error &&
    (error as { status?: number }).status === 400
  ) {
    appError = new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
  } else {
    appError = new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred", {
      expose: false,
    });
  }

  if (appError.statusCode >= 500) {
    logger.error(
      {
        err: error,
        requestId: req.requestId,
        method: req.method,
        path: req.path,
      },
      "Unhandled request error",
    );
  } else if (!env.isTest) {
    logger.debug(
      {
        code: appError.code,
        requestId: req.requestId,
        method: req.method,
        path: req.path,
      },
      "Request rejected",
    );
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.expose ? appError.message : "An unexpected error occurred",
      ...(appError.details ? { details: appError.details } : {}),
      requestId: req.requestId,
    },
  });
}
