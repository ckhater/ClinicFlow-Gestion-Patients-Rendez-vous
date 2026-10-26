import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errors";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(handler(req, res, next)).catch((error: unknown) => {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(error);
    });
  };
}
