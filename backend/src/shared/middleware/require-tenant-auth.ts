import type { NextFunction, Request, Response } from "express";
import { verify, type JwtPayload } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

export async function requireTenantAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const authorizationHeader = request.header("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  let payload: JwtPayload;
  let userId: number;
  let tenantId: number;
  let authVersion: number;

  try {
    payload = verify(
      token,
      env.auth.tenantAccessSecret,
    ) as JwtPayload;

    userId = Number(payload.sub);
    tenantId = Number(payload.tenantId);
    authVersion = Number(payload.authVersion);

    if (
      payload.actorType !== "TENANT" ||
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(tenantId) ||
      tenantId <= 0 ||
      !Number.isInteger(authVersion) ||
      authVersion <= 0 ||
      !isStringArray(payload.roles) ||
      !isStringArray(payload.permissions)
    ) {
      throw new Error("Invalid tenant token payload");
    }

  } catch {
    next(new AppError(401, "Invalid or expired access token"));
    return;
  }

  request.auth = {
    userId,
    tenantId,
    authVersion,
    roles: payload.roles,
    permissions: payload.permissions,
  };

  next();
}
