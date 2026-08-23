import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { database } from "../../src/config/database.js";
import { requireInternalService } from "../shared/internal/require-internal-service.js";

interface UserReferenceRow extends RowDataPacket {
    id: number;
    tenantId: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    deletedAt: Date | null;
}

interface LocationReferenceRow extends RowDataPacket {
    id: number;
    tenantId: number;
    name: string;
    code: string;
    status: string;
    deletedAt: Date | null;
}

function positiveInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export const accessInternalRouter = Router();

accessInternalRouter.use(requireInternalService);

accessInternalRouter.get("/users/:userId", async (request, response, next) => {
    try {
        const tenantId = positiveInteger(request.query.tenantId);
        const userId = positiveInteger(request.params.userId);

        if (!tenantId || !userId) {
            response.status(400).json({ error: { message: "Valid IDs required" } });
            return;
        }

        const [rows] = await database.execute<UserReferenceRow[]>(
            `SELECT id, tenant_id AS tenantId, first_name AS firstName,
                    last_name AS lastName, email, status, deleted_at AS deletedAt
             FROM users
             WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
             LIMIT 1`,
            [userId, tenantId],
        );

        if (!rows[0]) {
            response.status(404).json({ error: { message: "User not found" } });
            return;
        }

        response.json({ user: rows[0] });
    } catch (error) {
        next(error);
    }
});

accessInternalRouter.get(
    "/locations/:locationId",
    async (request, response, next) => {
        try {
            const tenantId = positiveInteger(request.query.tenantId);
            const locationId = positiveInteger(request.params.locationId);

            if (!tenantId || !locationId) {
                response.status(400).json({ error: { message: "Valid IDs required" } });
                return;
            }

            const [rows] = await database.execute<LocationReferenceRow[]>(
                `SELECT id, tenant_id AS tenantId, name, code, status,
                        deleted_at AS deletedAt
                 FROM locations
                 WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
                 LIMIT 1`,
                [locationId, tenantId],
            );

            if (!rows[0]) {
                response.status(404).json({
                    error: { message: "Location not found" },
                });
                return;
            }

            response.json({ location: rows[0] });
        } catch (error) {
            next(error);
        }
    },
);
