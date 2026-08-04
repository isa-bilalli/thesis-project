import type { CookieOptions } from "express";
import { env } from "../../config/env.js";

export const refreshTokenCookieName = "refreshToken";

export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge:
      env.auth.refreshTokenDays *
      24 *
      60 *
      60 *
      1000,
  };
}

export function getRefreshTokenClearOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/api/auth",
  };
}