import type { ValidationIssue } from "@clinic/shared";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ValidationIssue[];
  public readonly expose: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: { details?: ValidationIssue[]; expose?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.expose = options.expose ?? statusCode < 500;
  }
}

export const badRequest = (message: string, details?: ValidationIssue[]) =>
  new AppError(400, "BAD_REQUEST", message, { details });

export const unauthorized = (message = "Authentication required") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to perform this action") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "Resource not found") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

export const unprocessable = (message: string) =>
  new AppError(422, "UNPROCESSABLE_ENTITY", message);
