import { AppError } from "../../shared/errors/app-error.js";
import {
  getTenantDashboardData,
  type DashboardAccess,
  type TenantDashboardData,
} from "./dashboard.repository.js";

export async function getTenantDashboard(
  tenantId: number,
  access: DashboardAccess,
): Promise<TenantDashboardData> {
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const dashboard = await getTenantDashboardData(tenantId, access);

  if (!dashboard) {
    throw new AppError(404, "Dealership not found");
  }

  return dashboard;
}
