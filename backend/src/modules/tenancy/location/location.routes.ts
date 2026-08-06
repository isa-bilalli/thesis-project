import { Router } from "express";
import { requireTenantAuth } from "../../../shared/middleware/require-tenant-auth.js";
import { requirePermission } from "../../../shared/middleware/require-permission.js";
import {
  createLocationController,
  getLocationsController,
  setPrimaryLocationController,
  updateLocationController,
  updateLocationStatusController,
} from "./location.controller.js";

export const locationRouter = Router();

locationRouter.use(requireTenantAuth);

locationRouter.get("/", getLocationsController);
locationRouter.post(
  "/",
  requirePermission("locations.manage"),
  createLocationController,
);
locationRouter.patch(
  "/:locationId/primary",
  requirePermission("locations.manage"),
  setPrimaryLocationController,
);
locationRouter.patch(
  "/:locationId/status",
  requirePermission("locations.manage"),
  updateLocationStatusController,
);
locationRouter.patch(
  "/:locationId",
  requirePermission("locations.manage"),
  updateLocationController,
);
