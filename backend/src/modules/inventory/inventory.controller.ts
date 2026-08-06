import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  addVehicle,
  getVehicleById,
  listVehicles,
} from "./inventory.service.js";

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
