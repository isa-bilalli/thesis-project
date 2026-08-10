import { AppError } from "../../shared/errors/app-error.js";
import {
  createOffer as createOfferRepository,
  getOfferById as getOfferByIdRepository,
  listOffers as listOffersRepository,
  updateOffer as updateOfferRepository,
  updateOfferStatus as updateOfferStatusRepository,
  type OfferDetails,
  type OfferListPage,
  type OfferStatus,
} from "./offer.repository.js";
import {
  getReservationById as getReservationByIdRepository,
  listReservations as listReservationsRepository,
  updateReservation as updateReservationRepository,
  type ReservationDetails,
  type ReservationListPage,
} from "./reservation.repository.js";
import {
  createSale as createSaleRepository,
  getSaleById as getSaleByIdRepository,
  listSales as listSalesRepository,
  updateSale as updateSaleRepository,
  updateSaleStatus as updateSaleStatusRepository,
  type PaymentMethod,
  type SaleDetails,
  type SaleListPage,
  type SaleStatus,
} from "./sale.repository.js";
import type { VehicleReservationStatus } from "../inventory/inventory.repository.js";

export interface ListOffersInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  locationId?: unknown;
  customerId?: unknown;
  leadId?: unknown;
  vehicleId?: unknown;
  salespersonUserId?: unknown;
}

export interface GetOfferInput {
  tenantId: number;
  offerId: unknown;
}

export interface CreateOfferInput {
  tenantId: number;
  authenticatedUserId: number;
  locationId: unknown;
  leadId: unknown;
  customerId: unknown;
  vehicleId: unknown;
  salespersonUserId: unknown;
  vehiclePrice: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  feeAmount: unknown;
  validUntil: unknown;
  notes: unknown;
}

export interface UpdateOfferInput {
  tenantId: number;
  offerId: unknown;
  changes: Record<string, unknown>;
}

export interface UpdateOfferStatusInput {
  tenantId: number;
  offerId: unknown;
  status: unknown;
}

export interface ListReservationsInput {
  tenantId: number;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  customerId?: unknown;
  leadId?: unknown;
  vehicleId?: unknown;
  salespersonUserId?: unknown;
  expiresFrom?: unknown;
  expiresTo?: unknown;
}

export interface GetReservationInput {
  tenantId: number;
  reservationId: unknown;
}

export interface UpdateReservationInput {
  tenantId: number;
  reservationId: unknown;
  changes: Record<string, unknown>;
}

export interface ListSalesInput {
  tenantId: number;
  includeFinancials: boolean;
  page?: unknown;
  limit?: unknown;
  status?: unknown;
  locationId?: unknown;
  customerId?: unknown;
  vehicleId?: unknown;
  salespersonUserId?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
}

export interface GetSaleInput {
  tenantId: number;
  saleId: unknown;
  includeFinancials: boolean;
}

export interface CreateSaleInput {
  tenantId: number;
  authenticatedUserId: number;
  includeFinancials: boolean;
  locationId: unknown;
  customerId: unknown;
  vehicleId: unknown;
  salespersonUserId: unknown;
  leadId: unknown;
  offerId: unknown;
  reservationId: unknown;
  saleDate: unknown;
  vehiclePrice: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  feeAmount: unknown;
  paymentMethod: unknown;
  notes: unknown;
}

export interface UpdateSaleInput {
  tenantId: number;
  saleId: unknown;
  includeFinancials: boolean;
  changes: Record<string, unknown>;
}

export interface UpdateSaleStatusInput {
  tenantId: number;
  saleId: unknown;
  authenticatedUserId: number;
  includeFinancials: boolean;
  status: unknown;
  cancellationReason: unknown;
}

export type SaleDetailsResult = Omit<SaleDetails, "vehicleCostSnapshot"> &
  Partial<Pick<SaleDetails, "vehicleCostSnapshot">>;

export interface SaleListPageResult extends Omit<SaleListPage, "sales"> {
  sales: SaleDetailsResult[];
}

const OFFER_STATUSES: readonly OfferStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];
const OFFER_CLIENT_TRANSITIONS = [
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
] as const;
const RESERVATION_STATUSES: readonly VehicleReservationStatus[] = [
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "CONVERTED",
];
const SALE_STATUSES: readonly SaleStatus[] = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
];
const SALE_CLIENT_TRANSITIONS = ["COMPLETED", "CANCELLED"] as const;
const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "EXTERNAL_FINANCING",
  "OTHER",
];
const MAX_MONEY = 9_999_999_999.99;

function validateTenantId(tenantId: number): void {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new AppError(400, "A valid tenant ID is required");
  }
}

function validateUserId(userId: number): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AppError(400, "A valid authenticated user ID is required");
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

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
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

  const normalized = value.trim().toUpperCase() as T;

  if (!allowedValues.includes(normalized)) {
    throw new AppError(
      400,
      `${field} must be one of: ${allowedValues.join(", ")}`,
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

function parseOptionalDateTime(
  value: unknown,
  field: string,
): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return parseDateTime(value, field);
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
  maximumLength: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(400, `${field} must be a string or null`);
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new AppError(
      400,
      `${field} cannot exceed ${maximumLength} characters`,
    );
  }

  return normalized || null;
}

function parseMoney(
  value: unknown,
  field: string,
  fallback?: string,
): string {
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    throw new AppError(400, `${field} must be a valid non-negative amount`);
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new AppError(400, `${field} must be a valid non-negative amount`);
  }

  const normalized = String(value).trim();

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new AppError(
      400,
      `${field} must be a non-negative amount with at most two decimal places`,
    );
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed > MAX_MONEY) {
    throw new AppError(400, `${field} exceeds the supported price range`);
  }

  return parsed.toFixed(2);
}

function parseNullableMoney(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return parseMoney(value, field);
}

function validateSaleAmounts(
  vehiclePrice: string,
  discountAmount: string,
  taxAmount: string,
  feeAmount: string,
): void {
  const total =
    Number(vehiclePrice) -
    Number(discountAmount) +
    Number(taxAmount) +
    Number(feeAmount);

  if (Number(discountAmount) > Number(vehiclePrice)) {
    throw new AppError(400, "discountAmount cannot exceed vehiclePrice");
  }

  if (total > MAX_MONEY) {
    throw new AppError(400, "Calculated total exceeds the supported price range");
  }
}

function validatePagination(page: number, limit: number): void {
  if (page <= 0) {
    throw new AppError(400, "page must be a positive integer");
  }

  if (limit > 100) {
    throw new AppError(400, "limit cannot exceed 100");
  }
}

function filterSaleFinancials(
  sale: SaleDetails,
  includeFinancials: boolean,
): SaleDetailsResult {
  if (includeFinancials) {
    return sale;
  }

  const visibleSale: SaleDetailsResult = { ...sale };

  delete visibleSale.vehicleCostSnapshot;
  return visibleSale;
}

function throwOfferReferenceFailure(
  outcome:
    | "LOCATION_NOT_FOUND"
    | "CUSTOMER_NOT_FOUND"
    | "LEAD_NOT_FOUND"
    | "LEAD_CUSTOMER_MISMATCH"
    | "VEHICLE_NOT_FOUND"
    | "VEHICLE_LOCATION_MISMATCH"
    | "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER"
    | "SALESPERSON_NOT_FOUND",
): never {
  switch (outcome) {
    case "LOCATION_NOT_FOUND":
      throw new AppError(404, "Location not found");
    case "CUSTOMER_NOT_FOUND":
      throw new AppError(404, "Customer not found or inactive");
    case "LEAD_NOT_FOUND":
      throw new AppError(404, "Lead not found");
    case "LEAD_CUSTOMER_MISMATCH":
      throw new AppError(409, "Lead does not belong to the selected customer");
    case "VEHICLE_NOT_FOUND":
      throw new AppError(404, "Vehicle not found");
    case "VEHICLE_LOCATION_MISMATCH":
      throw new AppError(409, "Vehicle does not belong to the selected location");
    case "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER":
      throw new AppError(409, "Vehicle is reserved for another customer");
    case "SALESPERSON_NOT_FOUND":
      throw new AppError(404, "Salesperson not found");
  }
}

function throwSaleCreateFailure(
  result: Exclude<
    Awaited<ReturnType<typeof createSaleRepository>>,
    { outcome: "CREATED" }
  >,
): never {
  if (result.outcome === "VEHICLE_UNAVAILABLE") {
    throw new AppError(
      409,
      `A ${result.currentStatus.toLowerCase()} vehicle cannot be sold`,
    );
  }

  if (
    result.outcome === "LOCATION_NOT_FOUND" ||
    result.outcome === "CUSTOMER_NOT_FOUND" ||
    result.outcome === "LEAD_NOT_FOUND" ||
    result.outcome === "LEAD_CUSTOMER_MISMATCH" ||
    result.outcome === "VEHICLE_NOT_FOUND" ||
    result.outcome === "VEHICLE_LOCATION_MISMATCH" ||
    result.outcome === "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" ||
    result.outcome === "SALESPERSON_NOT_FOUND"
  ) {
    return throwOfferReferenceFailure(result.outcome);
  }

  switch (result.outcome) {
    case "VEHICLE_COST_MISSING":
      throw new AppError(
        409,
        "Vehicle purchase price is required before creating a sale",
      );
    case "OFFER_NOT_FOUND":
      throw new AppError(404, "Offer not found");
    case "OFFER_NOT_ACCEPTED":
      throw new AppError(
        409,
        `A ${result.currentStatus.toLowerCase()} offer cannot be converted to a sale`,
      );
    case "RESERVATION_NOT_FOUND":
      throw new AppError(404, "Reservation not found");
    case "RESERVATION_INACTIVE":
      throw new AppError(
        409,
        `A ${result.currentStatus.toLowerCase()} reservation cannot be converted to a sale`,
      );
    case "REFERENCE_MISMATCH":
      throw new AppError(
        409,
        "Offer or reservation does not match the selected sale records",
      );
    case "PENDING_SALE_EXISTS":
      throw new AppError(409, "A pending sale already exists for this vehicle");
  }
}

export async function listOffers(
  input: ListOffersInput,
): Promise<OfferListPage> {
  validateTenantId(input.tenantId);
  const page = parseQueryId(input.page, "page", 1) as number;
  const limit = parseQueryId(input.limit, "limit", 20) as number;
  validatePagination(page, limit);

  return listOffersRepository({
    tenantId: input.tenantId,
    page,
    limit,
    status: parseEnum(input.status, "status", OFFER_STATUSES),
    locationId: parseQueryId(input.locationId, "locationId"),
    customerId: parseQueryId(input.customerId, "customerId"),
    leadId: parseQueryId(input.leadId, "leadId"),
    vehicleId: parseQueryId(input.vehicleId, "vehicleId"),
    salespersonUserId: parseQueryId(
      input.salespersonUserId,
      "salespersonUserId",
    ),
  });
}

export async function getOfferById(
  input: GetOfferInput,
): Promise<OfferDetails> {
  validateTenantId(input.tenantId);
  const offer = await getOfferByIdRepository(
    input.tenantId,
    parsePathId(input.offerId, "offerId"),
  );

  if (!offer) {
    throw new AppError(404, "Offer not found");
  }

  return offer;
}

export async function createOffer(
  input: CreateOfferInput,
): Promise<OfferDetails> {
  validateTenantId(input.tenantId);
  validateUserId(input.authenticatedUserId);
  const vehiclePrice = parseMoney(input.vehiclePrice, "vehiclePrice");
  const discountAmount = parseMoney(
    input.discountAmount,
    "discountAmount",
    "0.00",
  );

  const taxAmount = parseMoney(input.taxAmount, "taxAmount", "0.00");
  const feeAmount = parseMoney(input.feeAmount, "feeAmount", "0.00");
  validateSaleAmounts(
    vehiclePrice,
    discountAmount,
    taxAmount,
    feeAmount,
  );

  const validUntil = parseOptionalDateTime(input.validUntil, "validUntil");

  if (validUntil && validUntil <= new Date()) {
    throw new AppError(400, "validUntil must be in the future");
  }

  const result = await createOfferRepository({
    tenantId: input.tenantId,
    locationId: parseBodyId(input.locationId, "locationId"),
    leadId: parseOptionalBodyId(input.leadId, "leadId"),
    customerId: parseBodyId(input.customerId, "customerId"),
    vehicleId: parseBodyId(input.vehicleId, "vehicleId"),
    salespersonUserId:
      input.salespersonUserId === undefined
        ? input.authenticatedUserId
        : parseBodyId(input.salespersonUserId, "salespersonUserId"),
    vehiclePrice,
    discountAmount,
    taxAmount,
    feeAmount,
    validUntil,
    notes: parseOptionalString(input.notes, "notes", 65_535),
  });

  if (result.outcome === "CREATED") {
    return result.offer;
  }

  if (result.outcome === "VEHICLE_UNAVAILABLE") {
    throw new AppError(
      409,
      `A ${result.currentStatus.toLowerCase()} vehicle cannot receive an offer`,
    );
  }

  return throwOfferReferenceFailure(result.outcome);
}

export async function updateOffer(
  input: UpdateOfferInput,
): Promise<OfferDetails> {
  validateTenantId(input.tenantId);
  const offerId = parsePathId(input.offerId, "offerId");
  const changes: {
    vehiclePrice?: string;
    discountAmount?: string;
    taxAmount?: string;
    feeAmount?: string;
    validUntil?: Date | null;
    notes?: string | null;
  } = {};

  for (const field of [
    "vehiclePrice",
    "discountAmount",
    "taxAmount",
    "feeAmount",
  ] as const) {
    if (field in input.changes) {
      changes[field] = parseMoney(input.changes[field], field);
    }
  }

  if ("validUntil" in input.changes) {
    changes.validUntil = parseOptionalDateTime(
      input.changes.validUntil,
      "validUntil",
    );

    if (changes.validUntil && changes.validUntil <= new Date()) {
      throw new AppError(400, "validUntil must be in the future");
    }
  }

  if ("notes" in input.changes) {
    changes.notes = parseOptionalString(input.changes.notes, "notes", 65_535);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one offer change is required");
  }

  const result = await updateOfferRepository({
    tenantId: input.tenantId,
    offerId,
    changes,
  });

  switch (result.outcome) {
    case "UPDATED":
      return result.offer;
    case "NOT_FOUND":
      throw new AppError(404, "Offer not found");
    case "INVALID_STATE":
      throw new AppError(
        409,
        `${result.currentStatus.toLowerCase()} offers cannot be edited`,
      );
    case "INVALID_AMOUNTS":
      throw new AppError(400, "Offer amounts are invalid or exceed the supported range");
  }
}

export async function updateOfferStatus(
  input: UpdateOfferStatusInput,
): Promise<OfferDetails> {
  validateTenantId(input.tenantId);
  const offerId = parsePathId(input.offerId, "offerId");
  const status = parseEnum(
    input.status,
    "status",
    OFFER_CLIENT_TRANSITIONS,
  );

  if (!status) {
    throw new AppError(400, "status is required");
  }

  const result = await updateOfferStatusRepository({
    tenantId: input.tenantId,
    offerId,
    status,
  });

  switch (result.outcome) {
    case "UPDATED":
      return result.offer;
    case "NOT_FOUND":
      throw new AppError(404, "Offer not found");
    case "INVALID_TRANSITION":
      throw new AppError(
        409,
        `Offer status cannot transition from ${result.currentStatus} to ${status}`,
      );
    case "OFFER_EXPIRED":
      throw new AppError(409, "Expired offers cannot change status");
    case "VEHICLE_UNAVAILABLE":
      throw new AppError(
        409,
        `A ${result.currentStatus.toLowerCase()} vehicle cannot have an accepted offer`,
      );
    case "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER":
      throw new AppError(409, "Vehicle is reserved for another customer");
    case "ANOTHER_OFFER_ACCEPTED":
      throw new AppError(409, "Another offer is already accepted for this vehicle");
  }
}

export async function listReservations(
  input: ListReservationsInput,
): Promise<ReservationListPage> {
  validateTenantId(input.tenantId);
  const page = parseQueryId(input.page, "page", 1) as number;
  const limit = parseQueryId(input.limit, "limit", 20) as number;
  validatePagination(page, limit);
  const expiresFrom = parseOptionalQueryDateTime(
    input.expiresFrom,
    "expiresFrom",
  );
  const expiresTo = parseOptionalQueryDateTime(input.expiresTo, "expiresTo");

  if (expiresFrom && expiresTo && expiresFrom >= expiresTo) {
    throw new AppError(400, "expiresFrom must be before expiresTo");
  }

  return listReservationsRepository({
    tenantId: input.tenantId,
    page,
    limit,
    status: parseEnum(input.status, "status", RESERVATION_STATUSES),
    customerId: parseQueryId(input.customerId, "customerId"),
    leadId: parseQueryId(input.leadId, "leadId"),
    vehicleId: parseQueryId(input.vehicleId, "vehicleId"),
    salespersonUserId: parseQueryId(
      input.salespersonUserId,
      "salespersonUserId",
    ),
    expiresFrom,
    expiresTo,
  });
}

export async function getReservationById(
  input: GetReservationInput,
): Promise<ReservationDetails> {
  validateTenantId(input.tenantId);
  const reservation = await getReservationByIdRepository(
    input.tenantId,
    parsePathId(input.reservationId, "reservationId"),
  );

  if (!reservation) {
    throw new AppError(404, "Reservation not found");
  }

  return reservation;
}

export async function updateReservation(
  input: UpdateReservationInput,
): Promise<ReservationDetails> {
  validateTenantId(input.tenantId);
  const reservationId = parsePathId(input.reservationId, "reservationId");
  const changes: {
    agreedPrice?: string | null;
    expiresAt?: Date;
    notes?: string | null;
  } = {};

  if ("agreedPrice" in input.changes) {
    changes.agreedPrice = parseNullableMoney(
      input.changes.agreedPrice,
      "agreedPrice",
    );
  }

  if ("expiresAt" in input.changes) {
    changes.expiresAt = parseDateTime(
      input.changes.expiresAt,
      "expiresAt",
    );

    if (changes.expiresAt <= new Date()) {
      throw new AppError(400, "expiresAt must be in the future");
    }
  }

  if ("notes" in input.changes) {
    changes.notes = parseOptionalString(input.changes.notes, "notes", 65_535);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one reservation change is required");
  }

  const result = await updateReservationRepository({
    tenantId: input.tenantId,
    reservationId,
    changes,
  });

  switch (result.outcome) {
    case "UPDATED":
      return result.reservation;
    case "NOT_FOUND":
      throw new AppError(404, "Reservation not found");
    case "INVALID_STATE":
      throw new AppError(
        409,
        `${result.currentStatus.toLowerCase()} reservations cannot be edited`,
      );
  }
}

export async function listSales(
  input: ListSalesInput,
): Promise<SaleListPageResult> {
  validateTenantId(input.tenantId);
  const page = parseQueryId(input.page, "page", 1) as number;
  const limit = parseQueryId(input.limit, "limit", 20) as number;
  validatePagination(page, limit);
  const dateFrom = parseOptionalQueryDateTime(input.dateFrom, "dateFrom");
  const dateTo = parseOptionalQueryDateTime(input.dateTo, "dateTo");

  if (dateFrom && dateTo && dateFrom >= dateTo) {
    throw new AppError(400, "dateFrom must be before dateTo");
  }

  const result = await listSalesRepository({
    tenantId: input.tenantId,
    page,
    limit,
    status: parseEnum(input.status, "status", SALE_STATUSES),
    locationId: parseQueryId(input.locationId, "locationId"),
    customerId: parseQueryId(input.customerId, "customerId"),
    vehicleId: parseQueryId(input.vehicleId, "vehicleId"),
    salespersonUserId: parseQueryId(
      input.salespersonUserId,
      "salespersonUserId",
    ),
    dateFrom,
    dateTo,
  });

  return {
    ...result,
    sales: result.sales.map((sale) =>
      filterSaleFinancials(sale, input.includeFinancials),
    ),
  };
}

export async function getSaleById(
  input: GetSaleInput,
): Promise<SaleDetailsResult> {
  validateTenantId(input.tenantId);
  const sale = await getSaleByIdRepository(
    input.tenantId,
    parsePathId(input.saleId, "saleId"),
  );

  if (!sale) {
    throw new AppError(404, "Sale not found");
  }

  return filterSaleFinancials(sale, input.includeFinancials);
}

export async function createSale(
  input: CreateSaleInput,
): Promise<SaleDetailsResult> {
  validateTenantId(input.tenantId);
  validateUserId(input.authenticatedUserId);
  const vehiclePrice = parseMoney(input.vehiclePrice, "vehiclePrice");
  const discountAmount = parseMoney(
    input.discountAmount,
    "discountAmount",
    "0.00",
  );

  const taxAmount = parseMoney(input.taxAmount, "taxAmount", "0.00");
  const feeAmount = parseMoney(input.feeAmount, "feeAmount", "0.00");
  validateSaleAmounts(
    vehiclePrice,
    discountAmount,
    taxAmount,
    feeAmount,
  );

  const paymentMethod = parseEnum(
    input.paymentMethod,
    "paymentMethod",
    PAYMENT_METHODS,
  );
  const result = await createSaleRepository({
    tenantId: input.tenantId,
    locationId: parseBodyId(input.locationId, "locationId"),
    customerId: parseBodyId(input.customerId, "customerId"),
    vehicleId: parseBodyId(input.vehicleId, "vehicleId"),
    salespersonUserId:
      input.salespersonUserId === undefined
        ? input.authenticatedUserId
        : parseBodyId(input.salespersonUserId, "salespersonUserId"),
    leadId: parseOptionalBodyId(input.leadId, "leadId"),
    offerId: parseOptionalBodyId(input.offerId, "offerId"),
    reservationId: parseOptionalBodyId(input.reservationId, "reservationId"),
    saleDate: parseDateTime(input.saleDate, "saleDate"),
    vehiclePrice,
    discountAmount,
    taxAmount,
    feeAmount,
    paymentMethod: paymentMethod ?? null,
    notes: parseOptionalString(input.notes, "notes", 65_535),
    createdByUserId: input.authenticatedUserId,
  });

  if (result.outcome !== "CREATED") {
    return throwSaleCreateFailure(result);
  }

  return filterSaleFinancials(result.sale, input.includeFinancials);
}

export async function updateSale(
  input: UpdateSaleInput,
): Promise<SaleDetailsResult> {
  validateTenantId(input.tenantId);
  const saleId = parsePathId(input.saleId, "saleId");
  const changes: {
    saleDate?: Date;
    vehiclePrice?: string;
    discountAmount?: string;
    taxAmount?: string;
    feeAmount?: string;
    paymentMethod?: PaymentMethod | null;
    notes?: string | null;
  } = {};

  if ("saleDate" in input.changes) {
    changes.saleDate = parseDateTime(input.changes.saleDate, "saleDate");
  }

  for (const field of [
    "vehiclePrice",
    "discountAmount",
    "taxAmount",
    "feeAmount",
  ] as const) {
    if (field in input.changes) {
      changes[field] = parseMoney(input.changes[field], field);
    }
  }

  if ("paymentMethod" in input.changes) {
    changes.paymentMethod =
      input.changes.paymentMethod === null ||
      input.changes.paymentMethod === ""
        ? null
        : (parseEnum(
            input.changes.paymentMethod,
            "paymentMethod",
            PAYMENT_METHODS,
          ) as PaymentMethod);
  }

  if ("notes" in input.changes) {
    changes.notes = parseOptionalString(input.changes.notes, "notes", 65_535);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(400, "At least one sale change is required");
  }

  const result = await updateSaleRepository({
    tenantId: input.tenantId,
    saleId,
    changes,
  });

  switch (result.outcome) {
    case "UPDATED":
      return filterSaleFinancials(result.sale, input.includeFinancials);
    case "NOT_FOUND":
      throw new AppError(404, "Sale not found");
    case "INVALID_STATE":
      throw new AppError(
        409,
        `${result.currentStatus.toLowerCase()} sales cannot be edited`,
      );
    case "INVALID_AMOUNTS":
      throw new AppError(400, "Sale amounts are invalid or exceed the supported range");
  }
}

export async function updateSaleStatus(
  input: UpdateSaleStatusInput,
): Promise<SaleDetailsResult> {
  validateTenantId(input.tenantId);
  validateUserId(input.authenticatedUserId);
  const saleId = parsePathId(input.saleId, "saleId");
  const status = parseEnum(
    input.status,
    "status",
    SALE_CLIENT_TRANSITIONS,
  );

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
      "cancellationReason can only be set when cancelling a sale",
    );
  }

  const result = await updateSaleStatusRepository({
    tenantId: input.tenantId,
    saleId,
    status,
    cancellationReason,
    updatedByUserId: input.authenticatedUserId,
  });

  switch (result.outcome) {
    case "UPDATED":
      return filterSaleFinancials(result.sale, input.includeFinancials);
    case "NOT_FOUND":
      throw new AppError(404, "Sale not found");
    case "INVALID_TRANSITION":
      throw new AppError(
        409,
        `Sale status cannot transition from ${result.currentStatus} to ${status}`,
      );
    case "VEHICLE_UNAVAILABLE":
      throw new AppError(
        409,
        `A ${result.currentStatus.toLowerCase()} vehicle cannot complete a sale`,
      );
    case "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER":
      throw new AppError(409, "Vehicle is reserved for another customer");
    case "RESERVATION_INACTIVE":
      throw new AppError(
        409,
        `A ${result.currentStatus.toLowerCase()} reservation cannot complete a sale`,
      );
    case "OFFER_NOT_ACCEPTED":
      throw new AppError(
        409,
        `A ${result.currentStatus.toLowerCase()} offer cannot complete a sale`,
      );
    case "CUSTOMER_INACTIVE":
      throw new AppError(409, "An inactive customer cannot complete a sale");
  }
}
