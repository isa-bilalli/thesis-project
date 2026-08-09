import { AppError } from "../../shared/errors/app-error.js";
import {
  createLeadActivity as createLeadActivityRepository,
  listLeadActivities as listLeadActivitiesRepository,
  updateLeadActivity as updateLeadActivityRepository,
  updateLeadActivityStatus as updateLeadActivityStatusRepository,
  type LeadActivity,
  type LeadActivityListPage,
  type LeadActivityStatus,
  type LeadActivityType,
} from "./lead-activity.repository.js";

export interface ListLeadActivitiesInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  leadId?: unknown;
  userId?: unknown;
  activityType?: unknown;
  status?: unknown;
  scheduledFrom?: unknown;
  scheduledTo?: unknown;
}

export interface CreateLeadActivityInput {
  tenantId: number;
  actorUserId: number;
  leadId: unknown;
  userId: unknown;
  activityType: unknown;
  status: unknown;
  subject: unknown;
  details: unknown;
  outcome: unknown;
  scheduledAt: unknown;
}

export interface UpdateLeadActivityInput {
  tenantId: number;
  activityId: unknown;
  changes: Record<string, unknown>;
}

export interface UpdateLeadActivityStatusInput {
  tenantId: number;
  activityId: unknown;
  status: unknown;
  outcome: unknown;
  scheduledAt: unknown;
}

const ACTIVITY_TYPES: readonly LeadActivityType[] = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "STATUS_CHANGE",
];
const CLIENT_ACTIVITY_TYPES = ACTIVITY_TYPES.filter(
  (type): type is Exclude<LeadActivityType, "STATUS_CHANGE"> =>
    type !== "STATUS_CHANGE",
);
const ACTIVITY_STATUSES: readonly LeadActivityStatus[] = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
];

function validateTenantId(tenantId: number): void {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }
}

function parseQueryPositiveInteger(
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
  const parsed = parseQueryPositiveInteger(value, field);

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

function parseEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  fallback?: T,
): T | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string`);
  }

  const normalized = value.trim().toUpperCase() as T;

  if (!allowed.includes(normalized)) {
    throw new AppError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }

  return normalized;
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

function parseOptionalDateTime(value: unknown, field: string): Date | undefined {
  return value === undefined ? undefined : parseDateTime(value, field);
}

export async function listLeadActivities(
  input: ListLeadActivitiesInput,
): Promise<LeadActivityListPage> {
  validateTenantId(input.tenantId);
  const page = parseQueryPositiveInteger(input.page, "page", 1) as number;
  const limit = parseQueryPositiveInteger(input.limit, "limit", 20) as number;

  if (limit > 100) {
    throw new AppError(400, "limit cannot exceed 100");
  }

  const scheduledFrom = parseOptionalDateTime(
    input.scheduledFrom,
    "scheduledFrom",
  );
  const scheduledTo = parseOptionalDateTime(input.scheduledTo, "scheduledTo");

  if (
    scheduledFrom !== undefined &&
    scheduledTo !== undefined &&
    scheduledFrom >= scheduledTo
  ) {
    throw new AppError(400, "scheduledFrom must be before scheduledTo");
  }

  return listLeadActivitiesRepository({
    tenantId: input.tenantId,
    page,
    limit,
    leadId: parseQueryPositiveInteger(input.leadId, "leadId"),
    userId: parseQueryPositiveInteger(input.userId, "userId"),
    activityType: parseEnum(
      input.activityType,
      "activityType",
      ACTIVITY_TYPES,
    ),
    status: parseEnum(input.status, "status", ACTIVITY_STATUSES),
    scheduledFrom,
    scheduledTo,
  });
}

export async function createLeadActivity(
  input: CreateLeadActivityInput,
): Promise<LeadActivity> {
  validateTenantId(input.tenantId);

  if (!Number.isSafeInteger(input.actorUserId) || input.actorUserId <= 0) {
    throw new AppError(400, "A valid actor user ID is required");
  }

  const leadId = parsePathId(input.leadId, "leadId");
  const userId =
    input.userId === undefined
      ? input.actorUserId
      : parseBodyId(input.userId, "userId");
  const activityType = parseEnum(
    input.activityType,
    "activityType",
    CLIENT_ACTIVITY_TYPES,
  );

  if (!activityType) {
    throw new AppError(400, "activityType is required");
  }

  const defaultStatus: "SCHEDULED" | "COMPLETED" =
    activityType === "NOTE" ? "COMPLETED" : "SCHEDULED";
  const status = parseEnum(
    input.status,
    "status",
    ["SCHEDULED", "COMPLETED"] as const,
    defaultStatus,
  ) as "SCHEDULED" | "COMPLETED";
  const scheduledAt =
    input.scheduledAt === undefined || input.scheduledAt === null
      ? null
      : parseDateTime(input.scheduledAt, "scheduledAt");

  if (status === "SCHEDULED" && scheduledAt === null) {
    throw new AppError(400, "scheduledAt is required for a scheduled activity");
  }

  if (status === "SCHEDULED" && scheduledAt !== null && scheduledAt <= new Date()) {
    throw new AppError(400, "scheduledAt must be in the future");
  }

  const result = await createLeadActivityRepository({
    tenantId: input.tenantId,
    leadId,
    userId,
    activityType,
    status,
    subject: parseOptionalString(input.subject, "subject", 150),
    details: parseOptionalString(input.details, "details", 65_535),
    outcome: parseOptionalString(input.outcome, "outcome", 255),
    scheduledAt,
  });

  if (result.outcome === "LEAD_NOT_FOUND") {
    throw new AppError(404, "Lead not found");
  }

  if (result.outcome === "USER_NOT_FOUND") {
    throw new AppError(404, "Activity user not found");
  }

  return result.activity;
}

export async function updateLeadActivity(
  input: UpdateLeadActivityInput,
): Promise<LeadActivity> {
  validateTenantId(input.tenantId);
  const activityId = parsePathId(input.activityId, "activityId");
  const changes: {
    userId?: number;
    subject?: string | null;
    details?: string | null;
    scheduledAt?: Date;
  } = {};

  if ("userId" in input.changes) {
    changes.userId = parseBodyId(input.changes.userId, "userId");
  }

  if ("subject" in input.changes) {
    changes.subject = parseOptionalString(input.changes.subject, "subject", 150);
  }

  if ("details" in input.changes) {
    changes.details = parseOptionalString(
      input.changes.details,
      "details",
      65_535,
    );
  }

  if ("scheduledAt" in input.changes) {
    changes.scheduledAt = parseDateTime(
      input.changes.scheduledAt,
      "scheduledAt",
    );

    if (changes.scheduledAt <= new Date()) {
      throw new AppError(400, "scheduledAt must be in the future");
    }
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one activity change is required");
  }

  const result = await updateLeadActivityRepository({
    tenantId: input.tenantId,
    activityId,
    changes,
  });

  switch (result.outcome) {
    case "NOT_FOUND":
      throw new AppError(404, "Lead activity not found");
    case "USER_NOT_FOUND":
      throw new AppError(404, "Activity user not found");
    case "INVALID_STATE":
      throw new AppError(
        409,
        `${result.currentStatus.toLowerCase()} activities cannot be edited`,
      );
    case "UPDATED":
      return result.activity;
  }
}

export async function updateLeadActivityStatus(
  input: UpdateLeadActivityStatusInput,
): Promise<LeadActivity> {
  validateTenantId(input.tenantId);
  const activityId = parsePathId(input.activityId, "activityId");
  const status = parseEnum(input.status, "status", ACTIVITY_STATUSES);

  if (!status) {
    throw new AppError(400, "status is required");
  }

  let scheduledAt: Date | null = null;

  if (status === "SCHEDULED") {
    scheduledAt = parseDateTime(input.scheduledAt, "scheduledAt");

    if (scheduledAt <= new Date()) {
      throw new AppError(400, "scheduledAt must be in the future");
    }
  } else if (input.scheduledAt !== undefined && input.scheduledAt !== null) {
    throw new AppError(
      400,
      "scheduledAt can only be set when rescheduling an activity",
    );
  }

  const result = await updateLeadActivityStatusRepository({
    tenantId: input.tenantId,
    activityId,
    status,
    outcome: parseOptionalString(input.outcome, "outcome", 255),
    scheduledAt,
  });

  if (result.outcome === "NOT_FOUND") {
    throw new AppError(404, "Lead activity not found");
  }

  if (result.outcome === "INVALID_TRANSITION") {
    throw new AppError(
      409,
      `Cannot change a ${result.currentStatus.toLowerCase()} activity to ${status.toLowerCase()}`,
    );
  }

  return result.activity;
}
