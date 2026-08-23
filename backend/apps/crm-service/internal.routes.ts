import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { database } from "../../src/config/database.js";
import { requireInternalService } from "../shared/internal/require-internal-service.js";

interface CustomerReferenceRow extends RowDataPacket {
    id: number;
    tenantId: number;
    customerType: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string;
    status: string;
    createdByUserId: number;
    deletedAt: Date | null;
}

interface LeadReferenceRow extends RowDataPacket {
    id: number;
    tenantId: number;
    customerId: number;
    locationId: number;
    source: string;
    priority: string;
    status: string;
    createdByUserId: number;
    deletedAt: Date | null;
}

function positiveInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export const crmInternalRouter = Router();
crmInternalRouter.use(requireInternalService);

crmInternalRouter.get("/customers/:customerId", async (request, response, next) => {
    try {
        const tenantId = positiveInteger(request.query.tenantId);
        const customerId = positiveInteger(request.params.customerId);

        if (!tenantId || !customerId) {
            response.status(400).json({ error: { message: "Valid IDs required" } });
            return;
        }

        const [rows] = await database.execute<CustomerReferenceRow[]>(
            `SELECT id, tenant_id AS tenantId, customer_type AS customerType,
                    first_name AS firstName, last_name AS lastName,
                    company_name AS companyName, phone, status,
                    created_by_user_id AS createdByUserId,
                    deleted_at AS deletedAt
             FROM customers
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
             LIMIT 1`,
            [customerId, tenantId],
        );

        if (!rows[0]) {
            response.status(404).json({ error: { message: "Customer not found" } });
            return;
        }

        response.json({ customer: rows[0] });
    } catch (error) {
        next(error);
    }
});

crmInternalRouter.get("/leads/:leadId", async (request, response, next) => {
    try {
        const tenantId = positiveInteger(request.query.tenantId);
        const leadId = positiveInteger(request.params.leadId);

        if (!tenantId || !leadId) {
            response.status(400).json({ error: { message: "Valid IDs required" } });
            return;
        }

        const [rows] = await database.execute<LeadReferenceRow[]>(
            `SELECT id, tenant_id AS tenantId, customer_id AS customerId,
                    location_id AS locationId, source, priority, status,
                    created_by_user_id AS createdByUserId,
                    deleted_at AS deletedAt
             FROM leads
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
             LIMIT 1`,
            [leadId, tenantId],
        );

        if (!rows[0]) {
            response.status(404).json({ error: { message: "Lead not found" } });
            return;
        }

        response.json({ lead: rows[0] });
    } catch (error) {
        next(error);
    }
});
