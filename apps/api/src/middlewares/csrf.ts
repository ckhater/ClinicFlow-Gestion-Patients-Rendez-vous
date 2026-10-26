import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

export const AUTH_COOKIE = "clinic_token";
export const CSRF_COOKIE = "clinic_csrf";
export const CSRF_HEADER = "x-csrf-token";

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    maxAge: EIGHT_HOURS_MS,
  };
}

export function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false, // Readable by the SPA so it can echo the value in a header.
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
    maxAge: EIGHT_HOURS_MS,
  };
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Double-submit CSRF protection. All state-changing requests must present the
 * `x-csrf-token` header matching the non-HttpOnly CSRF cookie. Bearer-token
 * clients are exempt because browsers never attach bearer tokens automatically.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (safeMethod || req.headers.authorization?.startsWith("Bearer ")) {
    next();
    return;
  }

  const cookieToken: unknown = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER);

  if (typeof cookieToken !== "string" || !headerToken) {
    next(new AppError(403, "CSRF_TOKEN_MISSING", "Missing CSRF token"));
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (
    cookieBuffer.length !== headerBuffer.length ||
    !timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    next(new AppError(403, "CSRF_TOKEN_INVALID", "Invalid CSRF token"));
    return;
  }

  next();
}
