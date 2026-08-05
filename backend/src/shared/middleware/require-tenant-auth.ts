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

export function requireTenantAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const authorizationHeader = request.header("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  try {
    const payload = verify(
      token,
      env.auth.tenantAccessSecret,
    ) as JwtPayload;

    const userId = Number(payload.sub);
    const tenantId = Number(payload.tenantId);

    if (
      payload.actorType !== "TENANT" ||
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(tenantId) ||
      tenantId <= 0 ||
      !isStringArray(payload.roles) ||
      !isStringArray(payload.permissions)
    ) {
      throw new Error("Invalid tenant token payload");
    }

    request.auth = {
      userId,
      tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
    };

    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
  }
}
