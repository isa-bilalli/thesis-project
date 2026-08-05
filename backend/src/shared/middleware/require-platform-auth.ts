import type { NextFunction, Request, Response } from "express";
import { verify, type JwtPayload } from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import { database } from "../../config/database.js";
import { env } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

interface PlatformAuthStateRow extends RowDataPacket {
  authVersion: number;
  role: "SYSTEM_ADMIN";
}

export async function requirePlatformAuth(
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
  let authVersion: number;

  try {
    payload = verify(
      token,
      env.auth.platformAccessSecret,
    ) as JwtPayload;
    userId = Number(payload.sub);
    authVersion = Number(payload.authVersion);

    if (
      payload.actorType !== "PLATFORM" ||
      payload.role !== "SYSTEM_ADMIN" ||
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !Number.isInteger(authVersion) ||
      authVersion <= 0
    ) {
      throw new Error("Invalid platform token payload");
    }
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
    return;
  }

  try {
    const [rows] = await database.execute<PlatformAuthStateRow[]>(
      `
        SELECT
          pu.auth_version AS authVersion,
          pu.role
        FROM platform_users pu
        WHERE pu.id = ?
          AND pu.role = 'SYSTEM_ADMIN'
          AND pu.status = 'ACTIVE'
          AND pu.deleted_at IS NULL
        LIMIT 1
      `,
      [userId],
    );

    const authState = rows[0];

    if (
      !authState ||
      authState.authVersion !== authVersion ||
      authState.role !== payload.role
    ) {
      next(new AppError(401, "Invalid or expired access token"));
      return;
    }

    request.platformAuth = {
      userId,
      authVersion,
      role: "SYSTEM_ADMIN",
    };
    next();
  } catch (error) {
    next(error);
  }
}
