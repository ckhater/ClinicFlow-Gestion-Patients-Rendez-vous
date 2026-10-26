import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../utils/errors";

const ISSUER = "clinicflow-api";
const AUDIENCE = "clinicflow-web";

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as JwtPayload;

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new AppError(401, "TOKEN_INVALID", "Invalid session token");
    }
    return payload.sub;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
    }
    if (error instanceof AppError) throw error;
    throw new AppError(401, "TOKEN_INVALID", "Invalid session token");
  }
}
