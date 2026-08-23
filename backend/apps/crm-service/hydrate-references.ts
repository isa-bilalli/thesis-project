import type { NextFunction, Request, Response } from "express";
import {
    hydrateLocationProjection,
    hydrateUserProjection,
    hydrateVehicleProjection,
} from "../shared/internal/reference-projections.js";

function positiveInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function hydrateCrmReferences(
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
        const userIds = new Set<number>([request.auth.userId]);
        const locationIds = new Set<number>();
        const vehicleIds = new Set<number>();

        for (const field of ["assignedToUserId", "userId", "salespersonUserId"]) {
            const value = positiveInteger(body[field]);
            if (value) userIds.add(value);
        }

        const locationId = positiveInteger(body.locationId);
        const bodyVehicleId = positiveInteger(body.vehicleId);
        const pathVehicleMatch = request.originalUrl.match(/\/vehicles\/(\d+)/);
        const pathVehicleId = positiveInteger(pathVehicleMatch?.[1]);

        if (locationId) locationIds.add(locationId);
        if (bodyVehicleId) vehicleIds.add(bodyVehicleId);
        if (pathVehicleId) vehicleIds.add(pathVehicleId);

        await Promise.all([
            ...[...userIds].map((id) => hydrateUserProjection(tenantId, id)),
            ...[...locationIds].map((id) =>
                hydrateLocationProjection(tenantId, id),
            ),
            ...[...vehicleIds].map((id) =>
                hydrateVehicleProjection(tenantId, id),
            ),
        ]);
        next();
    } catch (error) {
        next(error);
    }
}
