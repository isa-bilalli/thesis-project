import { Router } from "express";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { requireTenantAuth } from "../../shared/middleware/require-tenant-auth.js";
import {
  addVehicleController,
  getVehicleByIdController,
  getVehiclesController,
} from "./inventory.controller.js";

export const inventoryRouter = Router();

inventoryRouter.use("/tenant/vehicles", requireTenantAuth);

inventoryRouter.get(
  "/tenant/vehicles",
  requirePermission("inventory.read"),
  getVehiclesController,
);
inventoryRouter.post(
  "/tenant/vehicles",
  requirePermission("inventory.write"),
  addVehicleController,
);
inventoryRouter.get(
  "/tenant/vehicles/:vehicleId",
  requirePermission("inventory.read"),
  getVehicleByIdController,
);
