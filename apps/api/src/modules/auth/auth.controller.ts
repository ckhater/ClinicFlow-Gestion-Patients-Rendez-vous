import type { Request, Response } from "express";
import type { LoginInput } from "@clinic/shared";
import { login } from "./auth.service";
import {
  AUTH_COOKIE,
  CSRF_COOKIE,
  authCookieOptions,
  csrfCookieOptions,
  generateCsrfToken,
} from "../../middlewares/csrf";

export async function loginController(req: Request, res: Response): Promise<void> {
  const { user, token } = await login(req.body as LoginInput);
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  res.status(200).json({ data: user });
}

export function meController(req: Request, res: Response): void {
  res.status(200).json({ data: req.authUser });
}

export function logoutController(_req: Request, res: Response): void {
  const authOptions = authCookieOptions();
  const csrfOptions = csrfCookieOptions();
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: authOptions.httpOnly,
    secure: authOptions.secure,
    sameSite: authOptions.sameSite,
    path: authOptions.path,
  });
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: csrfOptions.httpOnly,
    secure: csrfOptions.secure,
    sameSite: csrfOptions.sameSite,
    path: csrfOptions.path,
  });
  res.status(204).end();
}

export function csrfController(req: Request, res: Response): void {
  const existing: unknown = req.cookies?.[CSRF_COOKIE];
  const token =
    typeof existing === "string" && /^[a-f0-9]{64}$/.test(existing)
      ? existing
      : generateCsrfToken();

  res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  res.status(200).json({ data: { csrfToken: token } });
}
