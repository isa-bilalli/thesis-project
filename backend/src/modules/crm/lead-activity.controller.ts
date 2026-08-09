import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createLeadActivity,
  listLeadActivities,
  updateLeadActivity,
  updateLeadActivityStatus,
} from "./lead-activity.service.js";

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

export async function listLeadActivitiesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const result = await listLeadActivities({
      tenantId: request.auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      leadId: request.query.leadId,
      userId: request.query.userId,
      activityType: request.query.activityType,
      status: request.query.status,
      scheduledFrom: request.query.scheduledFrom,
      scheduledTo: request.query.scheduledTo,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createLeadActivityController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseBody(request.body, "lead activity creation");
    rejectUnsupported(
      body,
      new Set([
        "userId",
        "activityType",
        "status",
        "subject",
        "details",
        "outcome",
        "scheduledAt",
      ]),
      "lead activity",
    );

    const activity = await createLeadActivity({
      tenantId: request.auth.tenantId,
      actorUserId: request.auth.userId,
      leadId: request.params.leadId,
      userId: body.userId,
      activityType: body.activityType,
      status: body.status,
      subject: body.subject,
      details: body.details,
      outcome: body.outcome,
      scheduledAt: body.scheduledAt,
    });

    response.status(201).json({ activity });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadActivityController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseBody(request.body, "lead activity update");
    rejectUnsupported(
      body,
      new Set(["userId", "subject", "details", "scheduledAt"]),
      "lead activity",
    );

    const activity = await updateLeadActivity({
      tenantId: request.auth.tenantId,
      activityId: request.params.activityId,
      changes: body,
    });

    response.status(200).json({ activity });
  } catch (error) {
    next(error);
  }
}

export async function updateLeadActivityStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.auth) {
      throw new AppError(401, "Authentication required");
    }

    const body = parseBody(request.body, "lead activity status update");
    rejectUnsupported(
      body,
      new Set(["status", "outcome", "scheduledAt"]),
      "activity status",
    );

    if (!("status" in body)) {
      throw new AppError(400, "status is required");
    }

    const activity = await updateLeadActivityStatus({
      tenantId: request.auth.tenantId,
      activityId: request.params.activityId,
      status: body.status,
      outcome: body.outcome,
      scheduledAt: body.scheduledAt,
    });

    response.status(200).json({ activity });
  } catch (error) {
    next(error);
  }
}
