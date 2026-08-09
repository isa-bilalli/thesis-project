import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  addLeadVehicle,
  deleteLeadVehicle,
  listLeadVehicles,
  updateLeadVehicle,
} from "./lead-vehicle.service.js";

const LEAD_VEHICLE_WRITE_FIELDS = new Set(["isPrimary", "interestNotes"]);

function parseObjectBody(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError(400, "Invalid lead vehicle request");
  }

  return body as Record<string, unknown>;
}

function rejectUnsupportedFields(
  body: Record<string, unknown>,
  allowedFields: ReadonlySet<string>,
): void {
  const unsupported = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (unsupported.length > 0) {
    throw new AppError(
      400,
      `Unsupported lead vehicle fields: ${unsupported.join(", ")}`,
    );
  }
}

export async function listLeadVehiclesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const vehicles = await listLeadVehicles({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
    });

    response.status(200).json({ vehicles });
  } catch (error) {
    next(error);
  }
}

export async function addLeadVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseObjectBody(request.body);
    rejectUnsupportedFields(
      body,
      new Set(["vehicleId", "isPrimary", "interestNotes"]),
    );

    const vehicle = await addLeadVehicle({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
      vehicleId: body.vehicleId,
      isPrimary: body.isPrimary,
      interestNotes: body.interestNotes,
    });

    response.status(201).json({ vehicle });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseObjectBody(request.body);
    rejectUnsupportedFields(body, LEAD_VEHICLE_WRITE_FIELDS);

    const vehicle = await updateLeadVehicle({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
      vehicleId: request.params.vehicleId,
      changes: body,
    });

    response.status(200).json({ vehicle });
  } catch (error) {
    next(error);
  }
}

export async function deleteLeadVehicleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    await deleteLeadVehicle({
      tenantId: request.auth.tenantId,
      leadId: request.params.leadId,
      vehicleId: request.params.vehicleId,
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
