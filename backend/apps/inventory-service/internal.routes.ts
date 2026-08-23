import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../src/config/database.js";
import { requireInternalService } from "../shared/internal/require-internal-service.js";

interface VehicleReferenceRow extends RowDataPacket {
    id: number;
    tenantId: number;
    locationId: number;
    stockNumber: string;
    vehicleCondition: string;
    status: string;
    make: string;
    model: string;
    modelYear: number;
    askingPrice: string | null;
    primaryImageUrl: string | null;
    createdByUserId: number;
    deletedAt: Date | null;
}

interface OperationRow extends RowDataPacket {
    status: "PROCESSING" | "COMPLETED" | "FAILED";
    resourceId: number;
    responseJson: unknown;
}

interface VehicleStatusRow extends RowDataPacket {
    status: string;
}

interface ReservationRow extends RowDataPacket {
    id: number;
    status: string;
}

function positiveInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseStoredResponse(value: unknown): unknown {
    if (typeof value === "string") {
        return JSON.parse(value);
    }

    return value;
}

export const inventoryInternalRouter = Router();

inventoryInternalRouter.use(requireInternalService);

inventoryInternalRouter.get(
    "/vehicles/:vehicleId",
    async (request, response, next) => {
        try {
            const tenantId = positiveInteger(request.query.tenantId);
            const vehicleId = positiveInteger(request.params.vehicleId);

            if (!tenantId || !vehicleId) {
                response.status(400).json({ error: { message: "Valid IDs required" } });
                return;
            }

            const [rows] = await database.execute<VehicleReferenceRow[]>(
                `SELECT id, tenant_id AS tenantId, location_id AS locationId,
                        stock_number AS stockNumber,
                        vehicle_condition AS vehicleCondition, status, make, model,
                        model_year AS modelYear, asking_price AS askingPrice,
                        primary_image_url AS primaryImageUrl,
                        created_by_user_id AS createdByUserId,
                        deleted_at AS deletedAt
                 FROM vehicles
                 WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
                 LIMIT 1`,
                [vehicleId, tenantId],
            );

            if (!rows[0]) {
                response.status(404).json({ error: { message: "Vehicle not found" } });
                return;
            }

            response.json({ vehicle: rows[0] });
        } catch (error) {
            next(error);
        }
    },
);

inventoryInternalRouter.post(
    "/vehicles/:vehicleId/commit-sale",
    async (request, response, next) => {
        const connection = await database.getConnection();

        try {
            const tenantId = positiveInteger(request.body?.tenantId);
            const vehicleId = positiveInteger(request.params.vehicleId);
            const updatedByUserId = positiveInteger(request.body?.updatedByUserId);
            const reservationId =
                request.body?.reservationId == null
                    ? null
                    : positiveInteger(request.body.reservationId);
            const operationId =
                typeof request.body?.operationId === "string"
                    ? request.body.operationId.trim()
                    : "";

            if (
                !tenantId ||
                !vehicleId ||
                !updatedByUserId ||
                !operationId ||
                operationId.length > 128 ||
                (request.body?.reservationId != null && !reservationId)
            ) {
                response.status(400).json({
                    error: { message: "Valid sale commit values are required" },
                });
                return;
            }

            await connection.beginTransaction();
            const [vehicleRows] = await connection.execute<VehicleStatusRow[]>(
                `SELECT status FROM vehicles
                 WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
                 LIMIT 1 FOR UPDATE`,
                [vehicleId, tenantId],
            );
            const vehicle = vehicleRows[0];

            if (!vehicle) {
                await connection.rollback();
                response.status(404).json({ error: { message: "Vehicle not found" } });
                return;
            }

            const [operationRows] = await connection.execute<OperationRow[]>(
                `SELECT status, resource_id AS resourceId,
                        response_json AS responseJson
                 FROM inventory_operations
                 WHERE tenant_id = ?
                   AND operation_type = 'COMMIT_SALE'
                   AND operation_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [tenantId, operationId],
            );
            const previousOperation = operationRows[0];

            if (previousOperation && previousOperation.resourceId !== vehicleId) {
                await connection.rollback();
                response.status(409).json({
                    error: { message: "Operation ID was used for another vehicle" },
                });
                return;
            }

            if (previousOperation?.status === "COMPLETED") {
                await connection.commit();
                response.json(parseStoredResponse(previousOperation.responseJson));
                return;
            }

            if (!previousOperation) {
                await connection.execute<ResultSetHeader>(
                    `INSERT INTO inventory_operations (
                        tenant_id, operation_id, operation_type,
                        resource_id, status
                     ) VALUES (?, ?, 'COMMIT_SALE', ?, 'PROCESSING')`,
                    [tenantId, operationId, vehicleId],
                );
            }

            if (vehicle.status !== "AVAILABLE" && vehicle.status !== "RESERVED") {
                await connection.rollback();
                response.status(409).json({
                    error: {
                        message: `Vehicle cannot be sold while its status is ${vehicle.status}`,
                    },
                });
                return;
            }

            let convertedReservationId: number | null = null;

            if (reservationId !== null) {
                const [reservationRows] = await connection.execute<ReservationRow[]>(
                    `SELECT id, status FROM vehicle_reservations
                     WHERE id = ? AND tenant_id = ? AND vehicle_id = ?
                     LIMIT 1 FOR UPDATE`,
                    [reservationId, tenantId, vehicleId],
                );
                const reservation = reservationRows[0];

                if (!reservation || reservation.status !== "ACTIVE") {
                    await connection.rollback();
                    response.status(409).json({
                        error: { message: "Reservation is not active" },
                    });
                    return;
                }

                convertedReservationId = reservation.id;
                await connection.execute<ResultSetHeader>(
                    `UPDATE vehicle_reservations
                     SET status = 'CONVERTED', updated_at = CURRENT_TIMESTAMP(3)
                     WHERE id = ? AND tenant_id = ? AND status = 'ACTIVE'`,
                    [reservation.id, tenantId],
                );
            }

            await connection.execute<ResultSetHeader>(
                `UPDATE vehicles
                 SET status = 'SOLD', updated_by_user_id = ?,
                     updated_at = CURRENT_TIMESTAMP(3)
                 WHERE id = ? AND tenant_id = ?
                   AND status IN ('AVAILABLE', 'RESERVED')
                   AND deleted_at IS NULL`,
                [updatedByUserId, vehicleId, tenantId],
            );

            const result = {
                outcome: "COMMITTED",
                vehicleId,
                status: "SOLD",
                reservationId: convertedReservationId,
            };
            await connection.execute<ResultSetHeader>(
                `UPDATE inventory_operations
                 SET status = 'COMPLETED', response_json = ?,
                     completed_at = CURRENT_TIMESTAMP(3)
                 WHERE tenant_id = ? AND operation_type = 'COMMIT_SALE'
                   AND operation_id = ?`,
                [JSON.stringify(result), tenantId, operationId],
            );
            await connection.commit();
            response.json(result);
        } catch (error) {
            await connection.rollback();
            next(error);
        } finally {
            connection.release();
        }
    },
);
