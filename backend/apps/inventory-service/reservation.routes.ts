import { Router } from "express";
import {
    getReservationByIdController,
    listReservationsController,
    updateReservationController,
} from "../../src/modules/sales/sales.controller.js";
import { requirePermission } from "../../src/shared/middleware/require-permission.js";
import { requireTenantAuth } from "../../src/shared/middleware/require-tenant-auth.js";

export const inventoryReservationRouter = Router();

inventoryReservationRouter.use("/tenant/reservations", requireTenantAuth);
inventoryReservationRouter.get(
    "/tenant/reservations",
    requirePermission("sales.read"),
    listReservationsController,
);
inventoryReservationRouter.get(
    "/tenant/reservations/:reservationId",
    requirePermission("sales.read"),
    getReservationByIdController,
);
inventoryReservationRouter.patch(
    "/tenant/reservations/:reservationId",
    requirePermission("inventory.reserve"),
    updateReservationController,
);
