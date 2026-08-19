import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { getTenantDashboard } from "./dashboard.service.js";

export async function getTenantDashboardController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const permissions = new Set(request.auth.permissions);
    const dashboard = await getTenantDashboard(request.auth.tenantId, {
      inventory: permissions.has("inventory.read"),
      crm: permissions.has("crm.read"),
      sales: permissions.has("sales.read"),
    });

    response.status(200).json({ dashboard });
  } catch (error) {
    next(error);
  }
}
