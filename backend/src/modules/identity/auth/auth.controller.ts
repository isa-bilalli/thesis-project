import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { AppError } from "../../../shared/errors/app-error.js";
import { loginTenantUser, getCurrentTenantUser, refreshTenantSession, logoutTenantSession } from "./auth.service.js";
import {
  getRefreshTokenClearOptions,
  getRefreshTokenCookieOptions,
  refreshTokenCookieName,
} from "./auth.cookies.js";

export async function refreshController(request: Request, response: Response, next: NextFunction): Promise<void> {
    try{
        const currentRefreshToken = request.cookies?.[refreshTokenCookieName];

        if (typeof currentRefreshToken !== "string") {
            throw new AppError(401, "Refresh token required")
        }

        const result = await refreshTenantSession(currentRefreshToken,);

        const {refreshToken, ...responseBody} = result
        response.cookie(refreshTokenCookieName, refreshToken, getRefreshTokenCookieOptions())

        response.status(200).json(responseBody);

    }catch(err){
        if(err instanceof AppError && err.statusCode === 401) {
            response.clearCookie(refreshTokenCookieName, getRefreshTokenClearOptions());
        }
        next(err);
    }
}

export async function getMeController(request: Request, response: Response, next: NextFunction): Promise<void> {
    try{
        if(!request.auth){
            throw new AppError(401, "Authentication required for this operation");
        }
        
        const user = await getCurrentTenantUser(request.auth.tenantId, request.auth.userId);
        response.status(200).json({
            user,
        });
    }catch(err){
        next(err);
    }
}

export async function loginController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = request.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      throw new AppError(
        400,
        "email and password are required",
      );
    }

    const result = await loginTenantUser({
      email,
      password,
    });

    const { refreshToken, ...responseBody } = result;

    response.cookie(
      refreshTokenCookieName,
      refreshToken,
      getRefreshTokenCookieOptions(),
    );

    response.status(200).json(responseBody);
  } catch (error) {
    next(error);
  }
}

export async function logoutController(request: Request, response: Response, next: NextFunction):Promise<void> {
  try{
    const rawRefreshToken = request.cookies?.[refreshTokenCookieName];
        await logoutTenantSession(
        typeof rawRefreshToken === 'string' ? rawRefreshToken:undefined
    );
    response.clearCookie(refreshTokenCookieName, getRefreshTokenClearOptions());
    response.status(204).send()
    }catch(err){
        next(err);
    } 
}