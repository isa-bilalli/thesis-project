import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createOffer,
  createSale,
  getOfferById,
  getReservationById,
  getSaleById,
  listOffers,
  listReservations,
  listSales,
  updateOffer,
  updateOfferStatus,
  updateReservation,
  updateSale,
  updateSaleStatus,
} from "./sales.service.js";

const OFFER_CREATE_FIELDS = new Set([
  "locationId",
  "leadId",
  "customerId",
  "vehicleId",
  "salespersonUserId",
  "vehiclePrice",
  "discountAmount",
  "taxAmount",
  "feeAmount",
  "validUntil",
  "notes",
]);
const OFFER_UPDATE_FIELDS = new Set([
  "vehiclePrice",
  "discountAmount",
  "taxAmount",
  "feeAmount",
  "validUntil",
  "notes",
]);
const RESERVATION_UPDATE_FIELDS = new Set([
  "agreedPrice",
  "expiresAt",
  "notes",
]);
const SALE_CREATE_FIELDS = new Set([
  "locationId",
  "customerId",
  "vehicleId",
  "salespersonUserId",
  "leadId",
  "offerId",
  "reservationId",
  "saleDate",
  "vehiclePrice",
  "discountAmount",
  "taxAmount",
  "feeAmount",
  "paymentMethod",
  "notes",
]);
const SALE_UPDATE_FIELDS = new Set([
  "saleDate",
  "vehiclePrice",
  "discountAmount",
  "taxAmount",
  "feeAmount",
  "paymentMethod",
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

function requireAuth(request: Request): NonNullable<Request["auth"]> {
  if (!request.auth) {
    throw new AppError(401, "Authentication required");
  }

  return request.auth;
}

function canReadFinancials(request: Request): boolean {
  return requireAuth(request).permissions.includes("inventory.financials.read");
}

export async function listOffersController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const result = await listOffers({
      tenantId: auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      locationId: request.query.locationId,
      customerId: request.query.customerId,
      leadId: request.query.leadId,
      vehicleId: request.query.vehicleId,
      salespersonUserId: request.query.salespersonUserId,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createOfferController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "offer creation");
    rejectUnsupported(body, OFFER_CREATE_FIELDS, "offer");
    const offer = await createOffer({
      tenantId: auth.tenantId,
      authenticatedUserId: auth.userId,
      locationId: body.locationId,
      leadId: body.leadId,
      customerId: body.customerId,
      vehicleId: body.vehicleId,
      salespersonUserId: body.salespersonUserId,
      vehiclePrice: body.vehiclePrice,
      discountAmount: body.discountAmount,
      taxAmount: body.taxAmount,
      feeAmount: body.feeAmount,
      validUntil: body.validUntil,
      notes: body.notes,
    });

    response.status(201).json({ offer });
  } catch (error) {
    next(error);
  }
}

export async function getOfferByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const offer = await getOfferById({
      tenantId: auth.tenantId,
      offerId: request.params.offerId,
    });

    response.status(200).json({ offer });
  } catch (error) {
    next(error);
  }
}

export async function updateOfferController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "offer update");
    rejectUnsupported(body, OFFER_UPDATE_FIELDS, "offer");
    const offer = await updateOffer({
      tenantId: auth.tenantId,
      offerId: request.params.offerId,
      changes: body,
    });

    response.status(200).json({ offer });
  } catch (error) {
    next(error);
  }
}

export async function updateOfferStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "offer status update");
    rejectUnsupported(body, new Set(["status"]), "offer status");

    if (!("status" in body)) {
      throw new AppError(400, "status is required");
    }

    const offer = await updateOfferStatus({
      tenantId: auth.tenantId,
      offerId: request.params.offerId,
      status: body.status,
    });

    response.status(200).json({ offer });
  } catch (error) {
    next(error);
  }
}

export async function listReservationsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const result = await listReservations({
      tenantId: auth.tenantId,
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      customerId: request.query.customerId,
      leadId: request.query.leadId,
      vehicleId: request.query.vehicleId,
      salespersonUserId: request.query.salespersonUserId,
      expiresFrom: request.query.expiresFrom,
      expiresTo: request.query.expiresTo,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getReservationByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const reservation = await getReservationById({
      tenantId: auth.tenantId,
      reservationId: request.params.reservationId,
    });

    response.status(200).json({ reservation });
  } catch (error) {
    next(error);
  }
}

export async function updateReservationController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "reservation update");
    rejectUnsupported(body, RESERVATION_UPDATE_FIELDS, "reservation");
    const reservation = await updateReservation({
      tenantId: auth.tenantId,
      reservationId: request.params.reservationId,
      changes: body,
    });

    response.status(200).json({ reservation });
  } catch (error) {
    next(error);
  }
}

export async function listSalesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const result = await listSales({
      tenantId: auth.tenantId,
      includeFinancials: canReadFinancials(request),
      page: request.query.page,
      limit: request.query.limit,
      status: request.query.status,
      locationId: request.query.locationId,
      customerId: request.query.customerId,
      vehicleId: request.query.vehicleId,
      salespersonUserId: request.query.salespersonUserId,
      dateFrom: request.query.dateFrom,
      dateTo: request.query.dateTo,
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createSaleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "sale creation");
    rejectUnsupported(body, SALE_CREATE_FIELDS, "sale");
    const sale = await createSale({
      tenantId: auth.tenantId,
      authenticatedUserId: auth.userId,
      includeFinancials: canReadFinancials(request),
      locationId: body.locationId,
      customerId: body.customerId,
      vehicleId: body.vehicleId,
      salespersonUserId: body.salespersonUserId,
      leadId: body.leadId,
      offerId: body.offerId,
      reservationId: body.reservationId,
      saleDate: body.saleDate,
      vehiclePrice: body.vehiclePrice,
      discountAmount: body.discountAmount,
      taxAmount: body.taxAmount,
      feeAmount: body.feeAmount,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
    });

    response.status(201).json({ sale });
  } catch (error) {
    next(error);
  }
}

export async function getSaleByIdController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const sale = await getSaleById({
      tenantId: auth.tenantId,
      saleId: request.params.saleId,
      includeFinancials: canReadFinancials(request),
    });

    response.status(200).json({ sale });
  } catch (error) {
    next(error);
  }
}

export async function updateSaleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "sale update");
    rejectUnsupported(body, SALE_UPDATE_FIELDS, "sale");
    const sale = await updateSale({
      tenantId: auth.tenantId,
      saleId: request.params.saleId,
      includeFinancials: canReadFinancials(request),
      changes: body,
    });

    response.status(200).json({ sale });
  } catch (error) {
    next(error);
  }
}

export async function updateSaleStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = requireAuth(request);
    const body = parseBody(request.body, "sale status update");
    rejectUnsupported(
      body,
      new Set(["status", "cancellationReason"]),
      "sale status",
    );

    if (!("status" in body)) {
      throw new AppError(400, "status is required");
    }

    const sale = await updateSaleStatus({
      tenantId: auth.tenantId,
      saleId: request.params.saleId,
      authenticatedUserId: auth.userId,
      includeFinancials: canReadFinancials(request),
      status: body.status,
      cancellationReason: body.cancellationReason,
    });

    response.status(200).json({ sale });
  } catch (error) {
    next(error);
  }
}
