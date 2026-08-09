import { AppError } from "../../shared/errors/app-error.js";
import {
  createTestDrive as createTestDriveRepository,
  getTestDriveById as getTestDriveByIdRepository,
  listTestDrives as listTestDrivesRepository,
  updateTestDrive as updateTestDriveRepository,
  updateTestDriveStatus as updateTestDriveStatusRepository,
  type TestDriveDetails,
  type TestDriveListPage,
  type TestDriveStatus,
} from "./test-drive.repository.js";

export interface ListTestDrivesInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  locationId?: unknown;
  leadId?: unknown;
  customerId?: unknown;
  vehicleId?: unknown;
  salespersonUserId?: unknown;
  scheduledFrom?: unknown;
  scheduledTo?: unknown;
}

export interface GetTestDriveInput {
  tenantId: number;
  testDriveId: unknown;
}

export interface CreateTestDriveInput {
  tenantId: number;
  createdByUserId: number;
  locationId: unknown;
  leadId: unknown;
  customerId: unknown;
  vehicleId: unknown;
  salespersonUserId: unknown;
  scheduledStart: unknown;
  scheduledEnd: unknown;
  notes: unknown;
}

export interface UpdateTestDriveInput {
  tenantId: number;
  testDriveId: unknown;
  changes: Record<string, unknown>;
}

export interface UpdateTestDriveStatusInput {
  tenantId: number;
  testDriveId: unknown;
  status: unknown;
  cancellationReason: unknown;
}

const TEST_DRIVE_STATUSES: readonly TestDriveStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

function validateTenantId(tenantId: number): void {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }
}

function parseQueryId(
  value: unknown,
  field: string,
  fallback?: number,
): number | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return parsed;
}

function parsePathId(value: unknown, field: string): number {
  const parsed = parseQueryId(value, field);

  if (parsed === undefined) {
    throw new AppError(400, `${field} is required`);
  }

  return parsed;
}

function parseBodyId(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AppError(400, `${field} must be a positive integer`);
  }

  return value as number;
}

function parseOptionalBodyId(value: unknown, field: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  return parseBodyId(value, field);
}

function parseStatus(value: unknown): TestDriveStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(400, "status must be a string");
  }

  const normalized = value.trim().toUpperCase() as TestDriveStatus;

  if (!TEST_DRIVE_STATUSES.includes(normalized)) {
    throw new AppError(
      400,
      `status must be one of: ${TEST_DRIVE_STATUSES.join(", ")}`,
    );
  }

  return normalized;
}

function parseDateTime(value: unknown, field: string): Date {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    throw new AppError(400, `${field} must be an ISO date-time string`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, `${field} must be a valid ISO date-time string`);
  }

  return parsed;
}

function parseOptionalQueryDateTime(
  value: unknown,
  field: string,
): Date | undefined {
  return value === undefined ? undefined : parseDateTime(value, field);
}

function parseOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string or null`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new AppError(400, `${field} cannot exceed ${maxLength} characters`);
  }

  return normalized || null;
}

function throwRepositoryFailure(
  outcome:
    | "LOCATION_NOT_FOUND"
    | "CUSTOMER_NOT_FOUND"
    | "LEAD_NOT_FOUND"
    | "LEAD_CUSTOMER_MISMATCH"
    | "VEHICLE_NOT_FOUND"
    | "SALESPERSON_NOT_FOUND"
    | "VEHICLE_CONFLICT"
    | "SALESPERSON_CONFLICT",
): never {
  switch (outcome) {
    case "LOCATION_NOT_FOUND":
      throw new AppError(404, "Location not found");
    case "CUSTOMER_NOT_FOUND":
      throw new AppError(404, "Customer not found");
    case "LEAD_NOT_FOUND":
      throw new AppError(404, "Lead not found");
    case "LEAD_CUSTOMER_MISMATCH":
      throw new AppError(409, "Lead does not belong to the selected customer");
    case "VEHICLE_NOT_FOUND":
      throw new AppError(404, "Vehicle not found");
    case "SALESPERSON_NOT_FOUND":
      throw new AppError(404, "Salesperson not found");
    case "VEHICLE_CONFLICT":
      throw new AppError(409, "Vehicle is already booked for this time");
    case "SALESPERSON_CONFLICT":
      throw new AppError(409, "Salesperson is already booked for this time");
  }
}

export async function listTestDrives(
  input: ListTestDrivesInput,
): Promise<TestDriveListPage> {
  validateTenantId(input.tenantId);
  const page = parseQueryId(input.page, "page", 1) as number;
  const limit = parseQueryId(input.limit, "limit", 20) as number;

  if (limit > 100) {
    throw new AppError(400, "limit cannot exceed 100");
  }

  const scheduledFrom = parseOptionalQueryDateTime(
    input.scheduledFrom,
    "scheduledFrom",
  );
  const scheduledTo = parseOptionalQueryDateTime(
    input.scheduledTo,
    "scheduledTo",
  );

  if (scheduledFrom && scheduledTo && scheduledFrom >= scheduledTo) {
    throw new AppError(400, "scheduledFrom must be before scheduledTo");
  }

  return listTestDrivesRepository({
    tenantId: input.tenantId,
    page,
    limit,
    status: parseStatus(input.status),
    locationId: parseQueryId(input.locationId, "locationId"),
    leadId: parseQueryId(input.leadId, "leadId"),
    customerId: parseQueryId(input.customerId, "customerId"),
    vehicleId: parseQueryId(input.vehicleId, "vehicleId"),
    salespersonUserId: parseQueryId(
      input.salespersonUserId,
      "salespersonUserId",
    ),
    scheduledFrom,
    scheduledTo,
  });
}

export async function getTestDriveById(
  input: GetTestDriveInput,
): Promise<TestDriveDetails> {
  validateTenantId(input.tenantId);
  const testDriveId = parsePathId(input.testDriveId, "testDriveId");
  const testDrive = await getTestDriveByIdRepository(
    input.tenantId,
    testDriveId,
  );

  if (!testDrive) {
    throw new AppError(404, "Test drive not found");
  }

  return testDrive;
}

export async function createTestDrive(
  input: CreateTestDriveInput,
): Promise<TestDriveDetails> {
  validateTenantId(input.tenantId);

  if (
    !Number.isSafeInteger(input.createdByUserId) ||
    input.createdByUserId <= 0
  ) {
    throw new AppError(400, "A valid creator user ID is required");
  }

  const scheduledStart = parseDateTime(input.scheduledStart, "scheduledStart");
  const scheduledEnd = parseDateTime(input.scheduledEnd, "scheduledEnd");

  if (scheduledStart <= new Date()) {
    throw new AppError(400, "scheduledStart must be in the future");
  }

  if (scheduledEnd <= scheduledStart) {
    throw new AppError(400, "scheduledEnd must be after scheduledStart");
  }

  const result = await createTestDriveRepository({
    tenantId: input.tenantId,
    createdByUserId: input.createdByUserId,
    locationId: parseBodyId(input.locationId, "locationId"),
    leadId: parseOptionalBodyId(input.leadId, "leadId"),
    customerId: parseBodyId(input.customerId, "customerId"),
    vehicleId: parseBodyId(input.vehicleId, "vehicleId"),
    salespersonUserId:
      input.salespersonUserId === undefined
        ? input.createdByUserId
        : parseBodyId(input.salespersonUserId, "salespersonUserId"),
    scheduledStart,
    scheduledEnd,
    notes: parseOptionalString(input.notes, "notes", 65_535),
  });

  if (result.outcome === "CREATED") {
    return result.testDrive;
  }

  if (result.outcome === "VEHICLE_UNAVAILABLE") {
    throw new AppError(
      409,
      `A ${result.status.toLowerCase()} vehicle cannot be scheduled for a test drive`,
    );
  }

  return throwRepositoryFailure(result.outcome);
}

export async function updateTestDrive(
  input: UpdateTestDriveInput,
): Promise<TestDriveDetails> {
  validateTenantId(input.tenantId);
  const testDriveId = parsePathId(input.testDriveId, "testDriveId");
  const changes: {
    locationId?: number;
    leadId?: number | null;
    customerId?: number;
    vehicleId?: number;
    salespersonUserId?: number;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    notes?: string | null;
  } = {};

  if ("locationId" in input.changes) {
    changes.locationId = parseBodyId(input.changes.locationId, "locationId");
  }
  if ("leadId" in input.changes) {
    changes.leadId = parseOptionalBodyId(input.changes.leadId, "leadId");
  }
  if ("customerId" in input.changes) {
    changes.customerId = parseBodyId(input.changes.customerId, "customerId");
  }
  if ("vehicleId" in input.changes) {
    changes.vehicleId = parseBodyId(input.changes.vehicleId, "vehicleId");
  }
  if ("salespersonUserId" in input.changes) {
    changes.salespersonUserId = parseBodyId(
      input.changes.salespersonUserId,
      "salespersonUserId",
    );
  }
  if ("scheduledStart" in input.changes) {
    changes.scheduledStart = parseDateTime(
      input.changes.scheduledStart,
      "scheduledStart",
    );

    if (changes.scheduledStart <= new Date()) {
      throw new AppError(400, "scheduledStart must be in the future");
    }
  }
  if ("scheduledEnd" in input.changes) {
    changes.scheduledEnd = parseDateTime(
      input.changes.scheduledEnd,
      "scheduledEnd",
    );
  }
  if ("notes" in input.changes) {
    changes.notes = parseOptionalString(input.changes.notes, "notes", 65_535);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one test drive change is required");
  }

  if (
    changes.scheduledStart &&
    changes.scheduledEnd &&
    changes.scheduledEnd <= changes.scheduledStart
  ) {
    throw new AppError(400, "scheduledEnd must be after scheduledStart");
  }

  const result = await updateTestDriveRepository({
    tenantId: input.tenantId,
    testDriveId,
    changes,
  });

  switch (result.outcome) {
    case "UPDATED":
      return result.testDrive;
    case "NOT_FOUND":
      throw new AppError(404, "Test drive not found");
    case "INVALID_STATE":
      throw new AppError(
        409,
        `${result.currentStatus.toLowerCase()} test drives cannot be edited`,
      );
    case "INVALID_TIME_RANGE":
      throw new AppError(400, "scheduledEnd must be after scheduledStart");
    case "VEHICLE_UNAVAILABLE":
      throw new AppError(
        409,
        `A ${result.status.toLowerCase()} vehicle cannot be scheduled for a test drive`,
      );
    default:
      return throwRepositoryFailure(result.outcome);
  }
}

export async function updateTestDriveStatus(
  input: UpdateTestDriveStatusInput,
): Promise<TestDriveDetails> {
  validateTenantId(input.tenantId);
  const testDriveId = parsePathId(input.testDriveId, "testDriveId");
  const status = parseStatus(input.status);

  if (!status) {
    throw new AppError(400, "status is required");
  }

  let cancellationReason: string | null = null;

  if (status === "CANCELLED") {
    cancellationReason = parseOptionalString(
      input.cancellationReason,
      "cancellationReason",
      255,
    );

    if (!cancellationReason) {
      throw new AppError(400, "cancellationReason is required when cancelling");
    }
  } else if (
    input.cancellationReason !== undefined &&
    input.cancellationReason !== null &&
    input.cancellationReason !== ""
  ) {
    throw new AppError(
      400,
      "cancellationReason can only be set when cancelling a test drive",
    );
  }

  const result = await updateTestDriveStatusRepository({
    tenantId: input.tenantId,
    testDriveId,
    status,
    cancellationReason,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Test drive not found");
  }

  if (result.outcome === "INVALID_TRANSITION") {
    throw new AppError(
      409,
      `Test drive status cannot transition from ${result.currentStatus} to ${status}`,
    );
  }

  return result.testDrive;
}
