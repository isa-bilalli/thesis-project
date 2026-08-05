import type { CookieOptions } from "express";
import { env } from "../../../config/env.js";

export const platformRefreshTokenCookieName =
  "platformRefreshToken";

export function getPlatformRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/api/platform/auth",
    maxAge:
      env.auth.refreshTokenDays *
      24 *
      60 *
      60 *
      1000,
  };
}

export function getPlatformRefreshTokenClearOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/api/platform/auth",
  };
}
