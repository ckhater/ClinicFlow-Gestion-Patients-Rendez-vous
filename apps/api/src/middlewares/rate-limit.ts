import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

function jsonRateLimitHandler(message: string) {
  return (req: Request, res: Response): void => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message,
        requestId: req.requestId,
      },
    });
  };
}

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: jsonRateLimitHandler("Too many requests. Please try again later."),
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => env.isTest,
  handler: jsonRateLimitHandler(
    "Too many login attempts. Please wait 15 minutes before trying again.",
  ),
});
