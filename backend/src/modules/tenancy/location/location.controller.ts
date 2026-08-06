import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  createLocation,
  getLocationsByTenant,
  setPrimaryLocation,
  updateLocation,
  updateLocationStatus,
} from "./location.service.js";

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

const UPDATABLE_LOCATION_FIELDS = new Set([
  "name",
  "code",
  "addressLine1",
  "addressLine2",
  "city",
  "postalCode",
  "countryCode",
  "phone",
  "email",
]);

export async function getLocationsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authorization required");
    }

    const locations = await getLocationsByTenant(request.auth.tenantId);

    response.status(200).json({ locations });
  } catch (error) {
    next(error);
  }
}

export async function createLocationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authorization required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid location creation request");
    }

    const locationBody = body as Record<string, unknown>;

    if (
      "tenantId" in locationBody ||
      "status" in locationBody ||
      "isPrimary" in locationBody
    ) {
      throw new AppError(
        400,
        "tenantId, status, and isPrimary cannot be set when creating a location",
      );
    }

    const {
      name,
      code,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      countryCode,
      phone,
      email,
    } = locationBody;

    if (
      typeof name !== "string" ||
      typeof code !== "string" ||
      typeof addressLine1 !== "string" ||
      !isOptionalString(addressLine2) ||
      typeof city !== "string" ||
      !isOptionalString(postalCode) ||
      typeof countryCode !== "string" ||
      !isOptionalString(phone) ||
      !isOptionalString(email)
    ) {
      throw new AppError(400, "Invalid location creation request");
    }

    const location = await createLocation({
      tenantId: request.auth.tenantId,
      name,
      code,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      countryCode,
      phone,
      email,
    });

    response.status(201).json({ location });
  } catch (error) {
    next(error);
  }
}

export async function updateLocationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authorization required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid location update request");
    }

    const locationBody = body as Record<string, unknown>;

    if (
      "tenantId" in locationBody ||
      "status" in locationBody ||
      "isPrimary" in locationBody
    ) {
      throw new AppError(
        400,
        "tenantId, status, and isPrimary cannot be changed with this endpoint",
      );
    }

    const unsupportedFields = Object.keys(locationBody).filter(
      (field) => !UPDATABLE_LOCATION_FIELDS.has(field),
    );

    if (unsupportedFields.length > 0) {
      throw new AppError(
        400,
        `Unsupported location fields: ${unsupportedFields.join(", ")}`,
      );
    }

    const {
      name,
      code,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      countryCode,
      phone,
      email,
    } = locationBody;

    if (
      (name !== undefined && typeof name !== "string") ||
      (code !== undefined && typeof code !== "string") ||
      (addressLine1 !== undefined && typeof addressLine1 !== "string") ||
      !isOptionalString(addressLine2) ||
      (city !== undefined && typeof city !== "string") ||
      !isOptionalString(postalCode) ||
      (countryCode !== undefined && typeof countryCode !== "string") ||
      !isOptionalString(phone) ||
      !isOptionalString(email)
    ) {
      throw new AppError(400, "Invalid location update request");
    }

    const location = await updateLocation({
      tenantId: request.auth.tenantId,
      locationId: Number(request.params.locationId),
      changes: {
        name,
        code,
        addressLine1,
        addressLine2,
        city,
        postalCode,
        countryCode,
        phone,
        email,
      },
    });

    response.status(200).json({ location });
  } catch (error) {
    next(error);
  }
}

export async function updateLocationStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authorization required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid location status request");
    }

    const locationBody = body as Record<string, unknown>;
    const fields = Object.keys(locationBody);

    if (
      fields.length !== 1 ||
      fields[0] !== "status" ||
      typeof locationBody.status !== "string"
    ) {
      throw new AppError(
        400,
        "The request body must contain only a string status",
      );
    }

    const location = await updateLocationStatus({
      tenantId: request.auth.tenantId,
      locationId: Number(request.params.locationId),
      status: locationBody.status,
    });

    response.status(200).json({ location });
  } catch (error) {
    next(error);
  }
}

export async function setPrimaryLocationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authorization required");
    }

    const location = await setPrimaryLocation({
      tenantId: request.auth.tenantId,
      locationId: Number(request.params.locationId),
    });

    response.status(200).json({ location });
  } catch (error) {
    next(error);
  }
}
