import { Router } from "express";
import { requirePlatformAuth } from "../../../shared/middleware/require-platform-auth.js";
import {
  createTenantController,
  getTenantByIdController,
  listTenantsController,
  updateTenantStatusController,
} from "./tenant.controller.js";

export const tenantRouter = Router();

tenantRouter.use(requirePlatformAuth);
tenantRouter.post("/", createTenantController);
tenantRouter.get("/", listTenantsController);
tenantRouter.patch("/:tenantId/status", updateTenantStatusController);
tenantRouter.get("/:tenantId", getTenantByIdController);
