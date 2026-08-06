import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  createTenant,
  getTenantById,
  listTenants,
  updateTenant,
  updateTenantStatus,
} from "./tenant.service.js";

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

const UPDATABLE_TENANT_FIELDS = new Set([
  "name",
  "contactEmail",
  "contactPhone",
  "currencyCode",
  "timezone",
]);

export async function createTenantController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.platformAuth) {
      throw new AppError(401, "Platform authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid tenant creation request");
    }

    const {
      name,
      slug,
      contactEmail,
      contactPhone,
      currencyCode,
      timezone,
      primaryLocation,
    } = body as Record<string, unknown>;

    if (
      typeof name !== "string" ||
      typeof slug !== "string" ||
      !isOptionalString(contactEmail) ||
      !isOptionalString(contactPhone) ||
      !isOptionalString(currencyCode) ||
      !isOptionalString(timezone) ||
      typeof primaryLocation !== "object" ||
      primaryLocation === null ||
      Array.isArray(primaryLocation)
    ) {
      throw new AppError(400, "Invalid tenant creation request");
    }

    const {
      name: locationName,
      code,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      countryCode,
      phone,
      email,
    } = primaryLocation as Record<string, unknown>;

    if (
      typeof locationName !== "string" ||
      typeof code !== "string" ||
      typeof addressLine1 !== "string" ||
      !isOptionalString(addressLine2) ||
      typeof city !== "string" ||
      !isOptionalString(postalCode) ||
      typeof countryCode !== "string" ||
      !isOptionalString(phone) ||
      !isOptionalString(email)
    ) {
      throw new AppError(400, "Invalid tenant creation request");
    }

    const tenant = await createTenant({
      name,
      slug,
      contactEmail: contactEmail ?? undefined,
      contactPhone: contactPhone ?? undefined,
      currencyCode: currencyCode ?? undefined,
      timezone: timezone ?? undefined,
      primaryLocation: {
        name: locationName,
        code,
        addressLine1,
        addressLine2: addressLine2 ?? undefined,
        city,
        postalCode: postalCode ?? undefined,
        countryCode,
        phone: phone ?? undefined,
        email: email ?? undefined,
      },
    });

    response.status(201).json({ tenant });
  } catch (error) {
    next(error);
  }
}

export async function updateTenantStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.platformAuth) {
      throw new AppError(401, "Platform authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid tenant status request");
    }

    const { status } = body as Record<string, unknown>;

    if (typeof status !== "string") {
      throw new AppError(400, "Tenant status is required");
    }

    const tenant = await updateTenantStatus({
      tenantId: Number(request.params.tenantId),
      status,
    });

    response.status(200).json({ tenant });
  } catch (error) {
    next(error);
  }
}

export async function updateTenantController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.platformAuth) {
      throw new AppError(401, "Platform authentication required");
    }

    const body: unknown = request.body;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AppError(400, "Invalid tenant update request");
    }

    const tenantBody = body as Record<string, unknown>;

    if (
      "tenantId" in tenantBody ||
      "slug" in tenantBody ||
      "status" in tenantBody ||
      "primaryLocation" in tenantBody
    ) {
      throw new AppError(
        400,
        "tenantId, slug, status, and primaryLocation cannot be changed with this endpoint",
      );
    }

    const unsupportedFields = Object.keys(tenantBody).filter(
      (field) => !UPDATABLE_TENANT_FIELDS.has(field),
    );

    if (unsupportedFields.length > 0) {
      throw new AppError(
        400,
        `Unsupported tenant fields: ${unsupportedFields.join(", ")}`,
      );
    }

    const {
      name,
      contactEmail,
      contactPhone,
      currencyCode,
      timezone,
    } = tenantBody;

    if (
      (name !== undefined && typeof name !== "string") ||
      !isOptionalString(contactEmail) ||
      !isOptionalString(contactPhone) ||
      (currencyCode !== undefined && typeof currencyCode !== "string") ||
      (timezone !== undefined && typeof timezone !== "string")
    ) {
      throw new AppError(400, "Invalid tenant update request");
    }

    const tenant = await updateTenant({
      tenantId: Number(request.params.tenantId),
      changes: {
        name,
        contactEmail,
        contactPhone,
        currencyCode,
        timezone,
      },
    });

    response.status(200).json({ tenant });
  } catch (error) {
    next(error);
  }
}

export async function listTenantsController(request: Request, response: Response, next: NextFunction): Promise<void> {
    try{
        if(!request.platformAuth){
            throw new AppError(401, "Authentication required");
        }
        const tenants = await listTenants()
        response.status(200).json({
            tenants
        });
    }catch(err){
        next(err);
    }
}

export async function getTenantByIdController(request: Request, response: Response, next: NextFunction): Promise<void> {
    try{
        if(!request.platformAuth){
            throw new AppError(401, "Authentication required")
        }
        const tenantId = Number(request.params.tenantId)
        const tenant = await getTenantById(tenantId)
        response.status(200).json({
            tenant
        })
    }catch(err){
        next(err);
    }
}
