import type { NextFunction, Request, Response } from "express";
import {
    hydrateCustomerProjection,
    hydrateLeadProjection,
    hydrateLocationProjection,
    hydrateOfferProjection,
    hydrateUserProjection,
} from "../shared/internal/reference-projections.js";

function positiveInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function hydrateInventoryReferences(
    request: Request,
    _response: Response,
    next: NextFunction,
): Promise<void> {
    if (!request.auth || request.method === "GET") {
        next();
        return;
    }

    try {
        const tenantId = request.auth.tenantId;
        const body =
            typeof request.body === "object" && request.body !== null
                ? (request.body as Record<string, unknown>)
                : {};
        const tasks: Array<Promise<void>> = [
            hydrateUserProjection(tenantId, request.auth.userId),
        ];
        const locationId = positiveInteger(body.locationId);
        const customerId = positiveInteger(body.customerId);
        const leadId = positiveInteger(body.leadId);
        const offerId = positiveInteger(body.offerId);

        if (locationId) tasks.push(hydrateLocationProjection(tenantId, locationId));
        if (customerId) tasks.push(hydrateCustomerProjection(tenantId, customerId));
        if (leadId) tasks.push(hydrateLeadProjection(tenantId, leadId));
        if (offerId) tasks.push(hydrateOfferProjection(tenantId, offerId));

        await Promise.all(tasks);
        next();
    } catch (error) {
        next(error);
    }
}
