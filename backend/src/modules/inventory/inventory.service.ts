import { AppError } from "../../shared/errors/app-error.js";
import {
  createVehicle as createVehicleRepository,
  getAllVehicles,
  getVehicleById as getVehicleByIdRep,
  type VehicleCondition,
  type VehicleDetails,
  type VehicleListPage,
  type VehicleStatus,
} from "./inventory.repository.js";

export interface ListVehiclesInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  condition?: unknown;
  locationId?: unknown;
  search?: unknown;
}

export interface GetVehicleByIdInput {
  tenantId: number;
  vehicleId: unknown;
  includeFinancials: boolean;
}

export interface AddVehicleInput {
  tenantId: number;
  createdByUserId: number;
  includeFinancials: boolean;
  locationId: unknown;
  stockNumber: unknown;
  vin: unknown;
  condition: unknown;
  make: unknown;
  model: unknown;
  trimLevel: unknown;
  modelYear: unknown;
  bodyType: unknown;
  fuelType: unknown;
  transmission: unknown;
  drivetrain: unknown;
  engineDescription: unknown;
  mileageKm: unknown;
  exteriorColor: unknown;
  interiorColor: unknown;
  registrationNumber: unknown;
  firstRegistrationDate: unknown;
  acquiredAt: unknown;
  purchasePrice: unknown;
  askingPrice: unknown;
  minimumPrice: unknown;
  primaryImageUrl: unknown;
  description: unknown;
}

export type VehicleDetailsResult = Omit<
  VehicleDetails,
  "purchasePrice" | "minimumPrice"
> &
  Partial<
    Pick<VehicleDetails, "purchasePrice" | "minimumPrice">
  >;

const VEHICLE_STATUSES: readonly VehicleStatus[] = [
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
];

const VEHICLE_CONDITIONS: readonly VehicleCondition[] = ["NEW", "USED"];

const MAX_VEHICLE_PRICE = 9_999_999_999.99;

function parsePositiveInteger(
  value: unknown,
  field: string,
  fallback?: number,
): number | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return parsed;
}

function parseEnum<T extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly T[],
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string`);
  }

  const normalized = value.trim().toUpperCase();

  if (!allowedValues.includes(normalized as T)) {
    throw new AppError(
      400,
      `${field} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return normalized as T;
}

function parseBodyPositiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return value as number;
}

function parseBodyNonNegativeInteger(
  value: unknown,
  field: string,
  fallback?: number,
): number {
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new AppError(400, `${field} must be a non-negative integer`);
  }

  return value as number;
}

function parseRequiredString(
  value: unknown,
  field: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw new AppError(400, `${field} is required`);
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > maximumLength) {
    throw new AppError(
      400,
      `${field} is required and cannot exceed ${maximumLength} characters`,
    );
  }

  return normalized;
}

function parseOptionalString(
  value: unknown,
  field: string,
  maximumLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string or null`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maximumLength) {
    throw new AppError(
      400,
      `${field} cannot exceed ${maximumLength} characters`,
    );
  }

  return normalized;
}

function parseOptionalPrice(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError(400, `${field} must be a valid non-negative price`);
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new AppError(400, `${field} must be a valid non-negative price`);
  }

  const normalized = String(value).trim();

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new AppError(
      400,
      `${field} must be a non-negative amount with at most two decimal places`,
    );
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed > MAX_VEHICLE_PRICE) {
    throw new AppError(400, `${field} exceeds the supported price range`);
  }

  return parsed.toFixed(2);
}

function parseOptionalCalendarDate(
  value: unknown,
  field: string,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, `${field} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new AppError(400, `${field} must be a valid calendar date`);
  }

  return value;
}

function parseOptionalDateTime(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be an ISO date-time string`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `${field} must be a valid ISO date-time string`);
  }

  return parsed;
}

function filterVehicleFinancials(
  vehicle: VehicleDetails,
  includeFinancials: boolean,
): VehicleDetailsResult {
  if (includeFinancials) {
    return vehicle;
  }

  const visibleVehicle: VehicleDetailsResult = { ...vehicle };

  delete visibleVehicle.purchasePrice;
  delete visibleVehicle.minimumPrice;

  return visibleVehicle;
}

export async function listVehicles(
  input: ListVehiclesInput,
): Promise<VehicleListPage> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const page = parsePositiveInteger(input.page, "page", 1) as number;
  const limit = parsePositiveInteger(input.limit, "limit", 20) as number;

  if (limit > 100) {
    throw new AppError(400, "limit cannot exceed 100");
  }

  const status = parseEnum(input.status, "status", VEHICLE_STATUSES);
  const condition = parseEnum(
    input.condition,
    "condition",
    VEHICLE_CONDITIONS,
  );
  const locationId = parsePositiveInteger(input.locationId, "locationId");
  let search: string | undefined;

  if (input.search !== undefined) {
    if (typeof input.search !== "string") {
      throw new AppError(400, "search must be a string");
    }

    search = input.search.trim() || undefined;

    if (search && search.length > 100) {
      throw new AppError(400, "search cannot exceed 100 characters");
    }
  }

  return getAllVehicles({
    tenantId: input.tenantId,
    page,
    limit,
    status,
    condition,
    locationId,
    search,
  });
}

export async function getVehicleById(
  input: GetVehicleByIdInput,
): Promise<VehicleDetailsResult> {
  if (!Number.isInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  const vehicleId = parsePositiveInteger(input.vehicleId, "vehicleId");

  if (vehicleId === undefined) {
    throw new AppError(400, "A valid vehicle ID is required");
  }

  const vehicle = await getVehicleByIdRep(input.tenantId, vehicleId);

  if (!vehicle) {
    throw new AppError(404, "Vehicle not found");
  }

  return filterVehicleFinancials(vehicle, input.includeFinancials);
}

export async function addVehicle(
  input: AddVehicleInput,
): Promise<VehicleDetailsResult> {
  if (!Number.isSafeInteger(input.tenantId) || input.tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }

  if (
    !Number.isSafeInteger(input.createdByUserId) ||
    input.createdByUserId <= 0
  ) {
    throw new AppError(400, "A valid creator user ID is required");
  }

  const locationId = parseBodyPositiveInteger(input.locationId, "locationId");
  const stockNumber = parseRequiredString(
    input.stockNumber,
    "stockNumber",
    50,
  );
  const vin = parseOptionalString(input.vin, "vin", 32)?.toUpperCase() ?? null;
  const condition = parseEnum(
    input.condition,
    "condition",
    VEHICLE_CONDITIONS,
  );
  const make = parseRequiredString(input.make, "make", 100);
  const model = parseRequiredString(input.model, "model", 100);
  const trimLevel = parseOptionalString(input.trimLevel, "trimLevel", 100);
  const modelYear = parseBodyPositiveInteger(input.modelYear, "modelYear");
  const maximumModelYear = new Date().getUTCFullYear() + 1;

  if (modelYear < 1886 || modelYear > maximumModelYear) {
    throw new AppError(
      400,
      `modelYear must be between 1886 and ${maximumModelYear}`,
    );
  }

  if (!condition) {
    throw new AppError(400, "condition is required");
  }

  const purchasePrice = parseOptionalPrice(
    input.purchasePrice,
    "purchasePrice",
  );
  const askingPrice = parseOptionalPrice(input.askingPrice, "askingPrice");
  const minimumPrice = parseOptionalPrice(
    input.minimumPrice,
    "minimumPrice",
  );

  if (
    minimumPrice !== null &&
    askingPrice !== null &&
    Number(minimumPrice) > Number(askingPrice)
  ) {
    throw new AppError(400, "minimumPrice cannot exceed askingPrice");
  }

  const result = await createVehicleRepository({
    tenantId: input.tenantId,
    createdByUserId: input.createdByUserId,
    locationId,
    stockNumber,
    vin,
    condition,
    make,
    model,
    trimLevel,
    modelYear,
    bodyType: parseOptionalString(input.bodyType, "bodyType", 50),
    fuelType: parseOptionalString(input.fuelType, "fuelType", 50),
    transmission: parseOptionalString(
      input.transmission,
      "transmission",
      50,
    ),
    drivetrain: parseOptionalString(input.drivetrain, "drivetrain", 50),
    engineDescription: parseOptionalString(
      input.engineDescription,
      "engineDescription",
      150,
    ),
    mileageKm: parseBodyNonNegativeInteger(
      input.mileageKm,
      "mileageKm",
      0,
    ),
    exteriorColor: parseOptionalString(
      input.exteriorColor,
      "exteriorColor",
      50,
    ),
    interiorColor: parseOptionalString(
      input.interiorColor,
      "interiorColor",
      50,
    ),
    registrationNumber:
      parseOptionalString(
        input.registrationNumber,
        "registrationNumber",
        30,
      )?.toUpperCase() ?? null,
    firstRegistrationDate: parseOptionalCalendarDate(
      input.firstRegistrationDate,
      "firstRegistrationDate",
    ),
    acquiredAt: parseOptionalDateTime(input.acquiredAt, "acquiredAt"),
    purchasePrice,
    askingPrice,
    minimumPrice,
    primaryImageUrl: parseOptionalString(
      input.primaryImageUrl,
      "primaryImageUrl",
      500,
    ),
    description: parseOptionalString(input.description, "description", 65_535),
  });

  switch (result.outcome) {
    case "LOCATION_NOT_FOUND":
      throw new AppError(404, "Location not found");
    case "STOCK_NUMBER_CONFLICT":
      throw new AppError(
        409,
        "A vehicle with this stock number already exists for this tenant",
      );
    case "VIN_CONFLICT":
      throw new AppError(
        409,
        "A vehicle with this VIN already exists for this tenant",
      );
    case "CREATED":
      return filterVehicleFinancials(
        result.vehicle,
        input.includeFinancials,
      );
  }
}
