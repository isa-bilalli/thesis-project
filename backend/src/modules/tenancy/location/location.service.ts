import {
  createLocation as createLocationRepository,
  getLocations,
  setPrimaryLocation as setPrimaryLocationRepository,
  updateLocation as updateLocationRepository,
  updateLocationStatus as updateLocationStatusRepository,
  type LocationListItem,
  type LocationStatus,
  type UpdateLocationChanges,
} from "./location.repository.js";
import { AppError } from "../../../shared/errors/app-error.js";

export interface CreateLocationInput {
  tenantId: number;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode?: string | null;
  countryCode: string;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateLocationInput {
  tenantId: number;
  locationId: number;
  changes: UpdateLocationChanges;
}

export interface UpdateLocationStatusInput {
  tenantId: number;
  locationId: number;
  status: string;
}

export interface SetPrimaryLocationInput {
  tenantId: number;
  locationId: number;
}

function optionalTrimmed(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLocationStatus(status: string): status is LocationStatus {
  return status === "ACTIVE" || status === "INACTIVE";
}

export async function getLocationsByTenant(
  tenantId: number,
): Promise<LocationListItem[]> {
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  return getLocations(tenantId);
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<LocationListItem> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const addressLine1 = input.addressLine1.trim();
  const addressLine2 = optionalTrimmed(input.addressLine2);
  const city = input.city.trim();
  const postalCode = optionalTrimmed(input.postalCode);
  const countryCode = input.countryCode.trim().toUpperCase();
  const phone = optionalTrimmed(input.phone);
  const email = optionalTrimmed(input.email)?.toLowerCase() ?? null;

  if (!name || name.length > 150) {
    throw new AppError(
      400,
      "Location name is required and cannot exceed 150 characters",
    );
  }

  if (!code || code.length > 30 || !/^[A-Z0-9_-]+$/.test(code)) {
    throw new AppError(
      400,
      "Location code may contain letters, numbers, underscores, and hyphens",
    );
  }

  if (!addressLine1 || addressLine1.length > 200) {
    throw new AppError(
      400,
      "Location address is required and cannot exceed 200 characters",
    );
  }

  if (addressLine2 && addressLine2.length > 200) {
    throw new AppError(
      400,
      "Location address line 2 cannot exceed 200 characters",
    );
  }

  if (!city || city.length > 100) {
    throw new AppError(
      400,
      "Location city is required and cannot exceed 100 characters",
    );
  }

  if (postalCode && postalCode.length > 20) {
    throw new AppError(
      400,
      "Location postal code cannot exceed 20 characters",
    );
  }

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new AppError(
      400,
      "Location country code must contain exactly two letters",
    );
  }

  if (phone && phone.length > 30) {
    throw new AppError(400, "Location phone cannot exceed 30 characters");
  }

  if (email && (!isValidEmail(email) || email.length > 255)) {
    throw new AppError(400, "A valid location email is required");
  }

  const result = await createLocationRepository({
    tenantId: input.tenantId,
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

  if (result.outcome === "CODE_CONFLICT") {
    throw new AppError(
      409,
      "A location with this code already exists for this tenant",
    );
  }

  return result.location;
}

export async function updateLocation(
  input: UpdateLocationInput,
): Promise<LocationListItem> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  if (!Number.isInteger(input.locationId) || input.locationId <= 0) {
    throw new AppError(400, "A valid location ID is required");
  }

  const changes: UpdateLocationChanges = {};

  if (input.changes.name !== undefined) {
    const name = input.changes.name.trim();

    if (!name || name.length > 150) {
      throw new AppError(
        400,
        "Location name is required and cannot exceed 150 characters",
      );
    }

    changes.name = name;
  }

  if (input.changes.code !== undefined) {
    const code = input.changes.code.trim().toUpperCase();

    if (!code || code.length > 30 || !/^[A-Z0-9_-]+$/.test(code)) {
      throw new AppError(
        400,
        "Location code may contain letters, numbers, underscores, and hyphens",
      );
    }

    changes.code = code;
  }

  if (input.changes.addressLine1 !== undefined) {
    const addressLine1 = input.changes.addressLine1.trim();

    if (!addressLine1 || addressLine1.length > 200) {
      throw new AppError(
        400,
        "Location address is required and cannot exceed 200 characters",
      );
    }

    changes.addressLine1 = addressLine1;
  }

  if (input.changes.addressLine2 !== undefined) {
    const addressLine2 = optionalTrimmed(input.changes.addressLine2);

    if (addressLine2 && addressLine2.length > 200) {
      throw new AppError(
        400,
        "Location address line 2 cannot exceed 200 characters",
      );
    }

    changes.addressLine2 = addressLine2;
  }

  if (input.changes.city !== undefined) {
    const city = input.changes.city.trim();

    if (!city || city.length > 100) {
      throw new AppError(
        400,
        "Location city is required and cannot exceed 100 characters",
      );
    }

    changes.city = city;
  }

  if (input.changes.postalCode !== undefined) {
    const postalCode = optionalTrimmed(input.changes.postalCode);

    if (postalCode && postalCode.length > 20) {
      throw new AppError(
        400,
        "Location postal code cannot exceed 20 characters",
      );
    }

    changes.postalCode = postalCode;
  }

  if (input.changes.countryCode !== undefined) {
    const countryCode = input.changes.countryCode.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new AppError(
        400,
        "Location country code must contain exactly two letters",
      );
    }

    changes.countryCode = countryCode;
  }

  if (input.changes.phone !== undefined) {
    const phone = optionalTrimmed(input.changes.phone);

    if (phone && phone.length > 30) {
      throw new AppError(400, "Location phone cannot exceed 30 characters");
    }

    changes.phone = phone;
  }

  if (input.changes.email !== undefined) {
    const email = optionalTrimmed(input.changes.email)?.toLowerCase() ?? null;

    if (email && (!isValidEmail(email) || email.length > 255)) {
      throw new AppError(400, "A valid location email is required");
    }

    changes.email = email;
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one location field must be provided");
  }

  const result = await updateLocationRepository({
    tenantId: input.tenantId,
    locationId: input.locationId,
    changes,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Location not found");
  }

  if (result.outcome === "CODE_CONFLICT") {
    throw new AppError(
      409,
      "A location with this code already exists for this tenant",
    );
  }

  return result.location;
}

export async function updateLocationStatus(
  input: UpdateLocationStatusInput,
): Promise<LocationListItem> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  if (!Number.isInteger(input.locationId) || input.locationId <= 0) {
    throw new AppError(400, "A valid location ID is required");
  }

  const status = input.status.trim().toUpperCase();

  if (!isLocationStatus(status)) {
    throw new AppError(400, "Status must be ACTIVE or INACTIVE");
  }

  const result = await updateLocationStatusRepository({
    tenantId: input.tenantId,
    locationId: input.locationId,
    status,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Location not found");
  }

  if (result.outcome === "PRIMARY_LOCATION_CONFLICT") {
    throw new AppError(
      409,
      "The primary location cannot be made inactive",
    );
  }

  return result.location;
}

export async function setPrimaryLocation(
  input: SetPrimaryLocationInput,
): Promise<LocationListItem> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  if (!Number.isInteger(input.locationId) || input.locationId <= 0) {
    throw new AppError(400, "A valid location ID is required");
  }

  const result = await setPrimaryLocationRepository({
    tenantId: input.tenantId,
    locationId: input.locationId,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Location not found");
  }

  if (result.outcome === "INACTIVE_LOCATION") {
    throw new AppError(409, "Only an active location can be made primary");
  }

  return result.location;
}
