import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType, ZodTypeDef } from "zod";
import type { ValidationIssue } from "@clinic/shared";
import { AppError } from "../utils/errors";

function toIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }));
}

export function validationError(error: ZodError): AppError {
  return new AppError(400, "VALIDATION_ERROR", "The request contains invalid data", {
    details: toIssues(error),
  });
}

export function validateBody<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(validationError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(validationError(result.error));
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(validationError(result.error));
      return;
    }
    req.validatedParams = result.data;
    next();
  };
}
