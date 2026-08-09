import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createTestDrive,
  getTestDriveById,
  listTestDrives,
  updateTestDrive,
  updateTestDriveStatus,
} from "./test-drive.service.js";

const TEST_DRIVE_WRITE_FIELDS = new Set([
  "locationId",
  "leadId",
  "customerId",
  "vehicleId",
  "salespersonUserId",
  "scheduledStart",
  "scheduledEnd",
  "notes",
]);

function parseBody(body: unknown, requestName: string): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, `Invalid ${requestName} request`);
  }

  return body as Record<string, unknown>;
}

function rejectUnsupported(
  body: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  resource: string,
): void {
  const unsupported = Object.keys(body).filter((field) => !allowed.has(field));

  if (unsupported.length > 0) {
    throw new AppError(
      400,
      `Unsupported ${resource} fields: ${unsupported.join(", ")}`,
    );
  }
}

export async function listTestDrivesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const result = await listTestDrives({
      tenantId: request.auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      locationId: request.query.locationId,
      leadId: request.query.leadId,
      customerId: request.query.customerId,
      vehicleId: request.query.vehicleId,
      salespersonUserId: request.query.salespersonUserId,
      scheduledFrom: request.query.scheduledFrom,
      scheduledTo: request.query.scheduledTo,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createTestDriveController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseBody(request.body, "test drive creation");
    rejectUnsupported(body, TEST_DRIVE_WRITE_FIELDS, "test drive");

    const testDrive = await createTestDrive({
      tenantId: request.auth.tenantId,
      createdByUserId: request.auth.userId,
      locationId: body.locationId,
      leadId: body.leadId,
      customerId: body.customerId,
      vehicleId: body.vehicleId,
      salespersonUserId: body.salespersonUserId,
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd,
      notes: body.notes,
    });

    response.status(201).json({ testDrive });
  } catch (error) {
    next(error);
  }
}

export async function getTestDriveByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const testDrive = await getTestDriveById({
      tenantId: request.auth.tenantId,
      testDriveId: request.params.testDriveId,
    });

    response.status(200).json({ testDrive });
  } catch (error) {
    next(error);
  }
}

export async function updateTestDriveController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseBody(request.body, "test drive update");
    rejectUnsupported(body, TEST_DRIVE_WRITE_FIELDS, "test drive");

    const testDrive = await updateTestDrive({
      tenantId: request.auth.tenantId,
      testDriveId: request.params.testDriveId,
      changes: body,
    });

    response.status(200).json({ testDrive });
  } catch (error) {
    next(error);
  }
}

export async function updateTestDriveStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseBody(request.body, "test drive status update");
    rejectUnsupported(
      body,
      new Set(["status", "cancellationReason"]),
      "test drive status",
    );

    if (!("status" in body)) {
      throw new AppError(400, "status is required");
    }

    const testDrive = await updateTestDriveStatus({
      tenantId: request.auth.tenantId,
      testDriveId: request.params.testDriveId,
      status: body.status,
      cancellationReason: body.cancellationReason,
    });

    response.status(200).json({ testDrive });
  } catch (error) {
    next(error);
  }
}
