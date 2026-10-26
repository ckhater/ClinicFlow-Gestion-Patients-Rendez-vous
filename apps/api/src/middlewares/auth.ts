import type { NextFunction, Request, Response } from "express";
import type { Role } from "@clinic/shared";
import { prisma } from "../lib/prisma";
import { AUTH_COOKIE } from "./csrf";
import { forbidden, unauthorized } from "../utils/errors";
import { asyncHandler } from "../utils/async-handler";
import { serializeUser } from "../utils/serializers";
import { userPublicSelect } from "../utils/selectors";
import { verifyAccessToken } from "../modules/auth/token.service";

function extractToken(req: Request): { token: string; source: "cookie" | "bearer" } | null {
  const authorization = req.header("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token.length > 0) return { token, source: "bearer" };
  }

  const cookieToken: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return { token: cookieToken, source: "cookie" };
  }

  return null;
}

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const extracted = extractToken(req);
    if (!extracted) {
      throw unauthorized("Authentication required");
    }

    const userId = verifyAccessToken(extracted.token);
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: userPublicSelect,
    });

    if (!user) {
      throw unauthorized("Your account is no longer active");
    }

    req.authUser = serializeUser(user);
    req.authSource = extracted.source;
    next();
  },
);

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(unauthorized("Authentication required"));
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      next(forbidden("You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
