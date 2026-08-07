import { Router } from "express";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { requireTenantAuth } from "../../shared/middleware/require-tenant-auth.js";
import {
  addVehicleController,
  cancelVehicleReservationController,
  deleteVehicleController,
  getVehicleByIdController,
  getVehiclesController,
  reserveVehicleController,
  restoreVehicleController,
  updateVehicleController,
  updateVehicleStatusController,
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
inventoryRouter.post(
  "/tenant/vehicles/:vehicleId/reservation",
  requirePermission("inventory.reserve"),
  reserveVehicleController,
);
inventoryRouter.post(
  "/tenant/vehicles/:vehicleId/restore",
  requirePermission("inventory.write"),
  restoreVehicleController,
);
inventoryRouter.delete(
  "/tenant/vehicles/:vehicleId/reservation",
  requirePermission("inventory.reserve"),
  cancelVehicleReservationController,
);
inventoryRouter.delete(
  "/tenant/vehicles/:vehicleId",
  requirePermission("inventory.write"),
  deleteVehicleController,
);
inventoryRouter.patch(
  "/tenant/vehicles/:vehicleId/status",
  requirePermission("inventory.write"),
  updateVehicleStatusController,
);
inventoryRouter.patch(
  "/tenant/vehicles/:vehicleId",
  requirePermission("inventory.write"),
  updateVehicleController,
);
