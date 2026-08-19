import { Router } from "express";
import { requireTenantAuth } from "../../shared/middleware/require-tenant-auth.js";
import { getTenantDashboardController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/tenant/dashboard",
  requireTenantAuth,
  getTenantDashboardController,
);
