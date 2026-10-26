import type { NextFunction, Request, Response } from "express";
import type { Role, UserPublic } from "@clinic/shared";

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedParams?: unknown;
      authUser?: UserPublic;
      authSource?: "cookie" | "bearer";
      requestId?: string;
    }
  }
}

export type AuthenticatedRequest = Request & {
  authUser: UserPublic;
  authSource: "cookie" | "bearer";
};

export type RoleRequest = AuthenticatedRequest & {
  authUser: UserPublic & { role: Role };
};

export type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;
