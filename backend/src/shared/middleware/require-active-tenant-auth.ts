import type { NextFunction, Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import { database } from "../../config/database.js";
import { AppError } from "../errors/app-error.js";

interface TenantAuthStateRow extends RowDataPacket {
  authVersion: number;
}

export async function requireActiveTenantAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  if (!request.auth) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  try {
    const [rows] = await database.execute<TenantAuthStateRow[]>(
      `
        SELECT u.auth_version AS authVersion
        FROM users u
        INNER JOIN tenants t
          ON t.id = u.tenant_id
        WHERE u.id = ?
          AND u.tenant_id = ?
          AND u.status = 'ACTIVE'
          AND u.deleted_at IS NULL
          AND t.status = 'ACTIVE'
          AND t.deleted_at IS NULL
        LIMIT 1
      `,
      [request.auth.userId, request.auth.tenantId],
    );
    const authState = rows[0];

    if (!authState || authState.authVersion !== request.auth.authVersion) {
      next(new AppError(401, "Invalid or expired access token"));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
