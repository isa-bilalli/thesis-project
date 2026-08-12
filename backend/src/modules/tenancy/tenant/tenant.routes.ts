import { Router } from "express";
import { requirePlatformAuth } from "../../../shared/middleware/require-platform-auth.js";
import {
  createPlatformTenantUserController,
  createTenantController,
  getTenantByIdController,
  listTenantsController,
  listPlatformTenantLocationsController,
  listPlatformTenantRolesController,
  listPlatformTenantUsersController,
  updateTenantController,
  updateTenantStatusController,
  updatePlatformTenantUserStatusController,
} from "./tenant.controller.js";

export const tenantRouter = Router();

tenantRouter.use(requirePlatformAuth);
tenantRouter.post("/", createTenantController);
tenantRouter.get("/", listTenantsController);
tenantRouter.get("/:tenantId/locations", listPlatformTenantLocationsController);
tenantRouter.get("/:tenantId/roles", listPlatformTenantRolesController);
tenantRouter.get("/:tenantId/users", listPlatformTenantUsersController);
tenantRouter.post("/:tenantId/users", createPlatformTenantUserController);
tenantRouter.patch(
  "/:tenantId/users/:userId/status",
  updatePlatformTenantUserStatusController,
);
tenantRouter.patch("/:tenantId/status", updateTenantStatusController);
tenantRouter.patch("/:tenantId", updateTenantController);
tenantRouter.get("/:tenantId", getTenantByIdController);
