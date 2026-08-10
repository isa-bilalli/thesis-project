import { Router } from "express";
import { requirePermission } from "../../shared/middleware/require-permission.js";
import { requireTenantAuth } from "../../shared/middleware/require-tenant-auth.js";
import {
  createOfferController,
  createSaleController,
  getOfferByIdController,
  getReservationByIdController,
  getSaleByIdController,
  listOffersController,
  listReservationsController,
  listSalesController,
  updateOfferController,
  updateOfferStatusController,
  updateReservationController,
  updateSaleController,
  updateSaleStatusController,
} from "./sales.controller.js";

export const salesRouter = Router();

salesRouter.use("/tenant/offers", requireTenantAuth);
salesRouter.use("/tenant/reservations", requireTenantAuth);
salesRouter.use("/tenant/sales", requireTenantAuth);

salesRouter.get(
  "/tenant/offers",
  requirePermission("sales.read"),
  listOffersController,
);
salesRouter.post(
  "/tenant/offers",
  requirePermission("sales.create_offer"),
  createOfferController,
);
salesRouter.get(
  "/tenant/offers/:offerId",
  requirePermission("sales.read"),
  getOfferByIdController,
);
salesRouter.patch(
  "/tenant/offers/:offerId/status",
  requirePermission("sales.create_offer"),
  updateOfferStatusController,
);
salesRouter.patch(
  "/tenant/offers/:offerId",
  requirePermission("sales.create_offer"),
  updateOfferController,
);

salesRouter.get(
  "/tenant/reservations",
  requirePermission("sales.read"),
  listReservationsController,
);
salesRouter.get(
  "/tenant/reservations/:reservationId",
  requirePermission("sales.read"),
  getReservationByIdController,
);
salesRouter.patch(
  "/tenant/reservations/:reservationId",
  requirePermission("inventory.reserve"),
  updateReservationController,
);

salesRouter.get(
  "/tenant/sales",
  requirePermission("sales.read"),
  listSalesController,
);
salesRouter.post(
  "/tenant/sales",
  requirePermission("sales.complete"),
  createSaleController,
);
salesRouter.get(
  "/tenant/sales/:saleId",
  requirePermission("sales.read"),
  getSaleByIdController,
);
salesRouter.patch(
  "/tenant/sales/:saleId/status",
  requirePermission("sales.complete"),
  updateSaleStatusController,
);
salesRouter.patch(
  "/tenant/sales/:saleId",
  requirePermission("sales.complete"),
  updateSaleController,
);
