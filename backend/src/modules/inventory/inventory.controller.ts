import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  addVehicle,
  cancelVehicleReservation,
  deleteVehicle,
  getVehicleById,
  listVehicles,
  reserveVehicle,
  restoreVehicle,
  updateVehicle,
  updateVehicleStatus,
  type UpdateVehicleChangesInput,
} from "./inventory.service.js";

const UPDATABLE_VEHICLE_FIELDS = new Set([
  "locationId",
  "stockNumber",
  "vin",
  "condition",
  "make",
  "model",
  "trimLevel",
  "modelYear",
  "bodyType",
  "fuelType",
  "transmission",
  "drivetrain",
  "engineDescription",
  "mileageKm",
  "exteriorColor",
  "interiorColor",
  "registrationNumber",
  "firstRegistrationDate",
  "acquiredAt",
  "purchasePrice",
  "askingPrice",
  "minimumPrice",
  "primaryImageUrl",
  "description",
]);

const PROTECTED_VEHICLE_UPDATE_FIELDS = new Set([
  "id",
  "tenantId",
  "status",
  "createdByUserId",
  "updatedByUserId",
  "createdAt",
  "updatedAt",
  "deletedAt",
]);

const VEHICLE_RESERVATION_FIELDS = new Set([
  "customerId",
  "leadId",
  "offerId",
  "agreedPrice",
  "expiresAt",
  "notes",
]);

export async function getVehiclesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const result = await listVehicles({
      tenantId: request.auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      condition: request.query.condition,
      locationId: request.query.locationId,
      search: request.query.search,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getVehicleByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const vehicle = await getVehicleById({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
    });

    response.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
}

export async function addVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid vehicle creation request");
    }

    const vehicleBody = body as Record<string, unknown>;

    if (
      "tenantId" in vehicleBody ||
      "createdByUserId" in vehicleBody ||
      "updatedByUserId" in vehicleBody ||
      "status" in vehicleBody
    ) {
      throw new AppError(
        400,
        "tenantId, creator, updater, and status cannot be set when creating a vehicle",
      );
    }

    const vehicle = await addVehicle({
      tenantId: request.auth.tenantId,
      createdByUserId: request.auth.userId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
      locationId: vehicleBody.locationId,
      stockNumber: vehicleBody.stockNumber,
      vin: vehicleBody.vin,
      condition: vehicleBody.condition,
      make: vehicleBody.make,
      model: vehicleBody.model,
      trimLevel: vehicleBody.trimLevel,
      modelYear: vehicleBody.modelYear,
      bodyType: vehicleBody.bodyType,
      fuelType: vehicleBody.fuelType,
      transmission: vehicleBody.transmission,
      drivetrain: vehicleBody.drivetrain,
      engineDescription: vehicleBody.engineDescription,
      mileageKm: vehicleBody.mileageKm,
      exteriorColor: vehicleBody.exteriorColor,
      interiorColor: vehicleBody.interiorColor,
      registrationNumber: vehicleBody.registrationNumber,
      firstRegistrationDate: vehicleBody.firstRegistrationDate,
      acquiredAt: vehicleBody.acquiredAt,
      purchasePrice: vehicleBody.purchasePrice,
      askingPrice: vehicleBody.askingPrice,
      minimumPrice: vehicleBody.minimumPrice,
      primaryImageUrl: vehicleBody.primaryImageUrl,
      description: vehicleBody.description,
    });

    response.status(201).json({ vehicle });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid vehicle update request");
    }

    const vehicleBody = body as Record<string, unknown>;
    const fields = Object.keys(vehicleBody);
    const protectedFields = fields.filter((field) =>
      PROTECTED_VEHICLE_UPDATE_FIELDS.has(field),
    );

    if (protectedFields.length > 0) {
      throw new AppError(
        400,
        `Protected vehicle fields cannot be changed: ${protectedFields.join(", ")}`,
      );
    }

    const unsupportedFields = fields.filter(
      (field) => !UPDATABLE_VEHICLE_FIELDS.has(field),
    );

    if (unsupportedFields.length > 0) {
      throw new AppError(
        400,
        `Unsupported vehicle fields: ${unsupportedFields.join(", ")}`,
      );
    }

    const vehicle = await updateVehicle({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      updatedByUserId: request.auth.userId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
      changes: vehicleBody as UpdateVehicleChangesInput,
    });

    response.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicleStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid vehicle status update request");
    }

    const vehicleBody = body as Record<string, unknown>;
    const fields = Object.keys(vehicleBody);

    if (fields.length !== 1 || fields[0] !== "status") {
      throw new AppError(
        400,
        "Vehicle status update request must contain only status",
      );
    }

    const vehicle = await updateVehicleStatus({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      updatedByUserId: request.auth.userId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
      status: vehicleBody.status,
    });

    response.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
}

export async function reserveVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid vehicle reservation request");
    }

    const reservationBody = body as Record<string, unknown>;
    const operationId = request.header("idempotency-key")?.trim() || null;

    if (operationId !== null && operationId.length > 128) {
      throw new AppError(400, "Idempotency-Key cannot exceed 128 characters");
    }
    const unsupportedFields = Object.keys(reservationBody).filter(
      (field) => !VEHICLE_RESERVATION_FIELDS.has(field),
    );

    if (unsupportedFields.length > 0) {
      throw new AppError(
        400,
        `Unsupported vehicle reservation fields: ${unsupportedFields.join(", ")}`,
      );
    }

    const result = await reserveVehicle({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      createdByUserId: request.auth.userId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
      customerId: reservationBody.customerId,
      leadId: reservationBody.leadId,
      offerId: reservationBody.offerId,
      agreedPrice: reservationBody.agreedPrice,
      expiresAt: reservationBody.expiresAt,
      notes: reservationBody.notes,
      operationId,
    });

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelVehicleReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;
    const operationId = request.header("idempotency-key")?.trim() || null;

    if (operationId !== null && operationId.length > 128) {
      throw new AppError(400, "Idempotency-Key cannot exceed 128 characters");
    }
    let cancellationReason: unknown;

    if (body !== undefined) {
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new AppError(400, "Invalid reservation cancellation request");
      }

      const cancellationBody = body as Record<string, unknown>;
      const unsupportedFields = Object.keys(cancellationBody).filter(
        (field) => field !== "cancellationReason",
      );

      if (unsupportedFields.length > 0) {
        throw new AppError(
          400,
          `Unsupported reservation cancellation fields: ${unsupportedFields.join(", ")}`,
        );
      }

      cancellationReason = cancellationBody.cancellationReason;
    }

    const result = await cancelVehicleReservation({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      cancelledByUserId: request.auth.userId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
      cancellationReason,
      operationId,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    await deleteVehicle({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      deletedByUserId: request.auth.userId,
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function restoreVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body: unknown = request.body;

    if (
      body !== undefined &&
      (typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      throw new AppError(400, "Vehicle restore request must be empty");
    }

    const vehicle = await restoreVehicle({
      tenantId: request.auth.tenantId,
      vehicleId: request.params.vehicleId,
      restoredByUserId: request.auth.userId,
      includeFinancials: request.auth.permissions.includes(
        "inventory.financials.read",
      ),
    });

    response.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
}
