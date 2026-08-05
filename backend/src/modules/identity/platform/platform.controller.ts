import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  getCurrentPlatformUser,
  loginPlatformUser,
  logoutPlatformSession,
  refreshPlatformSession,
} from "./platform.service.js";
import {
  getPlatformRefreshTokenClearOptions,
  getPlatformRefreshTokenCookieOptions,
  platformRefreshTokenCookieName,
} from "./platform.cookies.js";

export async function platformLoginController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = request.body?.email;
    const password = request.body?.password;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      throw new AppError(
        400,
        "Email and password are required",
      );
    }

    const result = await loginPlatformUser({ email, password });
    const { refreshToken, ...responseBody } = result;

    response.cookie(
      platformRefreshTokenCookieName,
      refreshToken,
      getPlatformRefreshTokenCookieOptions(),
    );
    response.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
}

export async function platformRefreshController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const currentRefreshToken =
      request.cookies?.[platformRefreshTokenCookieName];

    if (typeof currentRefreshToken !== "string") {
      throw new AppError(401, "Refresh token required");
    }

    const result = await refreshPlatformSession(
      currentRefreshToken,
    );
    const { refreshToken, ...responseBody } = result;

    response.cookie(
      platformRefreshTokenCookieName,
      refreshToken,
      getPlatformRefreshTokenCookieOptions(),
    );
    response.status(200).json(responseBody);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      response.clearCookie(
        platformRefreshTokenCookieName,
        getPlatformRefreshTokenClearOptions(),
      );
    }

    next(error);
  }
}

export async function platformLogoutController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken =
      request.cookies?.[platformRefreshTokenCookieName];

    await logoutPlatformSession(
      typeof rawRefreshToken === "string"
        ? rawRefreshToken
        : undefined,
    );

    response.clearCookie(
      platformRefreshTokenCookieName,
      getPlatformRefreshTokenClearOptions(),
    );
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getPlatformMeController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.platformAuth) {
      throw new AppError(401, "Authentication required");
    }

    const user = await getCurrentPlatformUser(
      request.platformAuth.userId,
    );
    response.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
