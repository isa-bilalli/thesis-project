import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { database } from "../../src/config/database.js";
import { requireInternalService } from "../shared/internal/require-internal-service.js";

interface OfferReferenceRow extends RowDataPacket {
    id: number;
    tenantId: number;
    offerNumber: string;
    locationId: number;
    leadId: number | null;
    customerId: number;
    vehicleId: number;
    salespersonUserId: number;
    vehiclePrice: string;
    discountAmount: string;
    taxAmount: string;
    feeAmount: string;
    status: string;
}

export const salesInternalRouter = Router();
salesInternalRouter.use(requireInternalService);

salesInternalRouter.get("/offers/:offerId", async (request, response, next) => {
    try {
        const offerId = Number(request.params.offerId);
        const tenantId = Number(request.query.tenantId);

        if (
            !Number.isSafeInteger(offerId) ||
            offerId <= 0 ||
            !Number.isSafeInteger(tenantId) ||
            tenantId <= 0
        ) {
            response.status(400).json({ error: { message: "Valid IDs required" } });
            return;
        }

        const [rows] = await database.execute<OfferReferenceRow[]>(
            `SELECT id, tenant_id AS tenantId, offer_number AS offerNumber,
                    location_id AS locationId,
                    lead_id AS leadId, customer_id AS customerId,
                    vehicle_id AS vehicleId,
                    salesperson_user_id AS salespersonUserId,
                    vehicle_price AS vehiclePrice,
                    discount_amount AS discountAmount,
                    tax_amount AS taxAmount, fee_amount AS feeAmount, status
             FROM offers
             WHERE id = ? AND tenant_id = ?
             LIMIT 1`,
            [offerId, tenantId],
        );

        if (!rows[0]) {
            response.status(404).json({ error: { message: "Offer not found" } });
            return;
        }

        response.json({ offer: rows[0] });
    } catch (error) {
        next(error);
    }
});
