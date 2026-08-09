import { AppError } from "../../shared/errors/app-error.js";
import {
  addLeadVehicle as addLeadVehicleRepository,
  deleteLeadVehicle as deleteLeadVehicleRepository,
  listLeadVehicles as listLeadVehiclesRepository,
  updateLeadVehicle as updateLeadVehicleRepository,
  type LeadVehicleInterest,
} from "./lead-vehicle.repository.js";

export interface LeadVehiclePathInput {
  tenantId: number;
  leadId: unknown;
  vehicleId?: unknown;
}

export interface AddLeadVehicleInput extends LeadVehiclePathInput {
  vehicleId: unknown;
  isPrimary: unknown;
  interestNotes: unknown;
}

export interface UpdateLeadVehicleInput extends LeadVehiclePathInput {
  vehicleId: unknown;
  changes: Record<string, unknown>;
}

function validateTenantId(tenantId: number): void {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }
}

function parsePathId(value: unknown, field: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return parsed;
}

function parseBodyId(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return value as number;
}

function parseInterestNotes(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, "interestNotes must be a string or null");
  }

  const normalized = value.trim();

  if (normalized.length > 500) {
    throw new AppError(400, "interestNotes cannot exceed 500 characters");
  }

  return normalized || null;
}

export async function listLeadVehicles(
  input: LeadVehiclePathInput,
): Promise<LeadVehicleInterest[]> {
  validateTenantId(input.tenantId);
  const leadId = parsePathId(input.leadId, "leadId");
  const result = await listLeadVehiclesRepository(input.tenantId, leadId);

  if (result.outcome === "LEAD_NOT_FOUND") {
    throw new AppError(404, "Lead not found");
  }

  return result.vehicles;
}

export async function addLeadVehicle(
  input: AddLeadVehicleInput,
): Promise<LeadVehicleInterest> {
  validateTenantId(input.tenantId);
  const leadId = parsePathId(input.leadId, "leadId");
  const vehicleId = parseBodyId(input.vehicleId, "vehicleId");

  if (input.isPrimary !== undefined && typeof input.isPrimary !== "boolean") {
    throw new AppError(400, "isPrimary must be a boolean");
  }

  const result = await addLeadVehicleRepository({
    tenantId: input.tenantId,
    leadId,
    vehicleId,
    isPrimary: input.isPrimary === true,
    interestNotes: parseInterestNotes(input.interestNotes),
  });

  switch (result.outcome) {
    case "LEAD_NOT_FOUND":
      throw new AppError(404, "Lead not found");
    case "VEHICLE_NOT_FOUND":
      throw new AppError(404, "Vehicle not found");
    case "VEHICLE_UNAVAILABLE":
      throw new AppError(
        409,
        `A ${result.status.toLowerCase()} vehicle cannot be added to a lead`,
      );
    case "ALREADY_ADDED":
      throw new AppError(409, "Vehicle is already associated with this lead");
    case "CREATED":
      return result.vehicle;
  }
}

export async function updateLeadVehicle(
  input: UpdateLeadVehicleInput,
): Promise<LeadVehicleInterest> {
  validateTenantId(input.tenantId);
  const leadId = parsePathId(input.leadId, "leadId");
  const vehicleId = parsePathId(input.vehicleId, "vehicleId");
  const changes: {
    isPrimary?: boolean;
    interestNotes?: string | null;
  } = {};

  if ("isPrimary" in input.changes) {
    if (typeof input.changes.isPrimary !== "boolean") {
      throw new AppError(400, "isPrimary must be a boolean");
    }

    changes.isPrimary = input.changes.isPrimary;
  }

  if ("interestNotes" in input.changes) {
    changes.interestNotes = parseInterestNotes(input.changes.interestNotes);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one vehicle interest change is required");
  }

  const result = await updateLeadVehicleRepository({
    tenantId: input.tenantId,
    leadId,
    vehicleId,
    changes,
  });

  if (result.outcome === "LEAD_NOT_FOUND") {
    throw new AppError(404, "Lead not found");
  }

  if (result.outcome === "INTEREST_NOT_FOUND") {
    throw new AppError(404, "Lead vehicle interest not found");
  }

  if (result.outcome === "CANNOT_CLEAR_ONLY_PRIMARY") {
    throw new AppError(
      409,
      "The only interested vehicle must remain primary",
    );
  }

  return result.vehicle;
}

export async function deleteLeadVehicle(
  input: LeadVehiclePathInput,
): Promise<void> {
  validateTenantId(input.tenantId);
  const leadId = parsePathId(input.leadId, "leadId");
  const vehicleId = parsePathId(input.vehicleId, "vehicleId");
  const result = await deleteLeadVehicleRepository(
    input.tenantId,
    leadId,
    vehicleId,
  );

  if (result.outcome === "LEAD_NOT_FOUND") {
    throw new AppError(404, "Lead not found");
  }

  if (result.outcome === "INTEREST_NOT_FOUND") {
    throw new AppError(404, "Lead vehicle interest not found");
  }
}
