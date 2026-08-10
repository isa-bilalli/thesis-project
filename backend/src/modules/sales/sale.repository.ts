import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { database } from "../../config/database.js";
import type { LeadStatus } from "../crm/crm.repository.js";
import type {
  VehicleReservationStatus,
  VehicleStatus,
} from "../inventory/inventory.repository.js";
import type { OfferStatus } from "./offer.repository.js";
import { expireStaleReservations } from "./reservation.repository.js";

export type SaleStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "EXTERNAL_FINANCING"
  | "OTHER";

export interface SaleDetails {
  id: number;
  saleNumber: string;
  location: { id: number; name: string; code: string };
  customer: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string;
  };
  vehicle: {
    id: number;
    stockNumber: string;
    make: string;
    model: string;
    modelYear: number;
    status: VehicleStatus;
  };
  salesperson: { id: number; firstName: string; lastName: string };
  lead: { id: number; status: LeadStatus } | null;
  offer: { id: number; offerNumber: string; status: OfferStatus } | null;
  reservation: {
    id: number;
    reservationNumber: string;
    status: VehicleReservationStatus;
  } | null;
  saleDate: Date;
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  totalAmount: string;
  vehicleCostSnapshot: string;
  paymentMethod: PaymentMethod | null;
  status: SaleStatus;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdBy: { id: number; firstName: string; lastName: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleListPage {
  sales: SaleDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListSalesRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: SaleStatus;
  locationId?: number;
  customerId?: number;
  vehicleId?: number;
  salespersonUserId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateSaleRepositoryInput {
  tenantId: number;
  locationId: number;
  customerId: number;
  vehicleId: number;
  salespersonUserId: number;
  leadId: number | null;
  offerId: number | null;
  reservationId: number | null;
  saleDate: Date;
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdByUserId: number;
}

export interface UpdateSaleRepositoryInput {
  tenantId: number;
  saleId: number;
  changes: {
    saleDate?: Date;
    vehiclePrice?: string;
    discountAmount?: string;
    taxAmount?: string;
    feeAmount?: string;
    paymentMethod?: PaymentMethod | null;
    notes?: string | null;
  };
}

export interface UpdateSaleStatusRepositoryInput {
  tenantId: number;
  saleId: number;
  status: "COMPLETED" | "CANCELLED";
  cancellationReason: string | null;
  updatedByUserId: number;
}

type SaleReferenceFailure =
  | { outcome: "LOCATION_NOT_FOUND" }
  | { outcome: "CUSTOMER_NOT_FOUND" }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "LEAD_CUSTOMER_MISMATCH" }
  | { outcome: "VEHICLE_NOT_FOUND" }
  | { outcome: "VEHICLE_LOCATION_MISMATCH" }
  | { outcome: "VEHICLE_UNAVAILABLE"; currentStatus: VehicleStatus }
  | { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" }
  | { outcome: "VEHICLE_COST_MISSING" }
  | { outcome: "SALESPERSON_NOT_FOUND" }
  | { outcome: "OFFER_NOT_FOUND" }
  | { outcome: "OFFER_NOT_ACCEPTED"; currentStatus: OfferStatus }
  | { outcome: "RESERVATION_NOT_FOUND" }
  | {
      outcome: "RESERVATION_INACTIVE";
      currentStatus: VehicleReservationStatus;
    }
  | { outcome: "REFERENCE_MISMATCH" }
  | { outcome: "PENDING_SALE_EXISTS" };

export type CreateSaleRepositoryResult =
  | { outcome: "CREATED"; sale: SaleDetails }
  | SaleReferenceFailure;

export type UpdateSaleRepositoryResult =
  | { outcome: "UPDATED"; sale: SaleDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_STATE"; currentStatus: SaleStatus }
  | { outcome: "INVALID_AMOUNTS" };

export type UpdateSaleStatusRepositoryResult =
  | { outcome: "UPDATED"; sale: SaleDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: SaleStatus }
  | { outcome: "VEHICLE_UNAVAILABLE"; currentStatus: VehicleStatus }
  | { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" }
  | { outcome: "RESERVATION_INACTIVE"; currentStatus: VehicleReservationStatus }
  | { outcome: "OFFER_NOT_ACCEPTED"; currentStatus: OfferStatus }
  | { outcome: "CUSTOMER_INACTIVE" };

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface CustomerRow extends RowDataPacket {
  status: "PROSPECT" | "CUSTOMER" | "INACTIVE";
}

interface LeadCustomerRow extends RowDataPacket {
  customerId: number;
}

interface VehicleReferenceRow extends RowDataPacket {
  locationId: number;
  status: VehicleStatus;
  purchasePrice: string | null;
}

interface OfferReferenceRow extends RowDataPacket {
  status: OfferStatus;
  locationId: number;
  customerId: number;
  vehicleId: number;
  leadId: number | null;
}

interface ReservationReferenceRow extends RowDataPacket {
  id: number;
  status: VehicleReservationStatus;
  customerId: number;
  vehicleId: number;
  leadId: number | null;
  offerId: number | null;
}

interface SaleStateRow extends RowDataPacket {
  status: SaleStatus;
  customerId: number;
  vehicleId: number;
  leadId: number | null;
  offerId: number | null;
  reservationId: number | null;
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
}

interface SaleRow extends RowDataPacket {
  id: number;
  saleNumber: string;
  locationId: number;
  locationName: string;
  locationCode: string;
  customerId: number;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCompanyName: string | null;
  customerPhone: string;
  vehicleId: number;
  vehicleStockNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleModelYear: number;
  vehicleStatus: VehicleStatus;
  salespersonUserId: number;
  salespersonFirstName: string;
  salespersonLastName: string;
  leadId: number | null;
  leadStatus: LeadStatus | null;
  offerId: number | null;
  offerNumber: string | null;
  offerStatus: OfferStatus | null;
  reservationId: number | null;
  reservationNumber: string | null;
  reservationStatus: VehicleReservationStatus | null;
  saleDate: Date;
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  totalAmount: string;
  vehicleCostSnapshot: string;
  paymentMethod: PaymentMethod | null;
  status: SaleStatus;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByFirstName: string;
  createdByLastName: string;
  createdAt: Date;
  updatedAt: Date;
}

const SALE_SELECT = `
  SELECT
    sale_record.id,
    sale_record.sale_number AS saleNumber,
    location_record.id AS locationId,
    location_record.name AS locationName,
    location_record.code AS locationCode,
    customer.id AS customerId,
    customer.first_name AS customerFirstName,
    customer.last_name AS customerLastName,
    customer.company_name AS customerCompanyName,
    customer.phone AS customerPhone,
    vehicle.id AS vehicleId,
    vehicle.stock_number AS vehicleStockNumber,
    vehicle.make AS vehicleMake,
    vehicle.model AS vehicleModel,
    vehicle.model_year AS vehicleModelYear,
    vehicle.status AS vehicleStatus,
    salesperson.id AS salespersonUserId,
    salesperson.first_name AS salespersonFirstName,
    salesperson.last_name AS salespersonLastName,
    lead_record.id AS leadId,
    lead_record.status AS leadStatus,
    offer_record.id AS offerId,
    offer_record.offer_number AS offerNumber,
    offer_record.status AS offerStatus,
    reservation.id AS reservationId,
    reservation.reservation_number AS reservationNumber,
    reservation.status AS reservationStatus,
    sale_record.sale_date AS saleDate,
    sale_record.vehicle_price AS vehiclePrice,
    sale_record.discount_amount AS discountAmount,
    sale_record.tax_amount AS taxAmount,
    sale_record.fee_amount AS feeAmount,
    sale_record.total_amount AS totalAmount,
    sale_record.vehicle_cost_snapshot AS vehicleCostSnapshot,
    sale_record.payment_method AS paymentMethod,
    sale_record.status,
    sale_record.completed_at AS completedAt,
    sale_record.cancelled_at AS cancelledAt,
    sale_record.cancellation_reason AS cancellationReason,
    sale_record.notes,
    creator.id AS createdByUserId,
    creator.first_name AS createdByFirstName,
    creator.last_name AS createdByLastName,
    sale_record.created_at AS createdAt,
    sale_record.updated_at AS updatedAt
  FROM sales sale_record
  INNER JOIN locations location_record
    ON location_record.id = sale_record.location_id
    AND location_record.tenant_id = sale_record.tenant_id
  INNER JOIN customers customer
    ON customer.id = sale_record.customer_id
    AND customer.tenant_id = sale_record.tenant_id
  INNER JOIN vehicles vehicle
    ON vehicle.id = sale_record.vehicle_id
    AND vehicle.tenant_id = sale_record.tenant_id
  INNER JOIN users salesperson
    ON salesperson.id = sale_record.salesperson_user_id
    AND salesperson.tenant_id = sale_record.tenant_id
  LEFT JOIN leads lead_record
    ON lead_record.id = sale_record.lead_id
    AND lead_record.tenant_id = sale_record.tenant_id
  LEFT JOIN offers offer_record
    ON offer_record.id = sale_record.offer_id
    AND offer_record.tenant_id = sale_record.tenant_id
  LEFT JOIN vehicle_reservations reservation
    ON reservation.id = sale_record.reservation_id
    AND reservation.tenant_id = sale_record.tenant_id
  INNER JOIN users creator
    ON creator.id = sale_record.created_by_user_id
    AND creator.tenant_id = sale_record.tenant_id
`;

function mapSale(row: SaleRow): SaleDetails {
  return {
    id: row.id,
    saleNumber: row.saleNumber,
    location: {
      id: row.locationId,
      name: row.locationName,
      code: row.locationCode,
    },
    customer: {
      id: row.customerId,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      companyName: row.customerCompanyName,
      phone: row.customerPhone,
    },
    vehicle: {
      id: row.vehicleId,
      stockNumber: row.vehicleStockNumber,
      make: row.vehicleMake,
      model: row.vehicleModel,
      modelYear: row.vehicleModelYear,
      status: row.vehicleStatus,
    },
    salesperson: {
      id: row.salespersonUserId,
      firstName: row.salespersonFirstName,
      lastName: row.salespersonLastName,
    },
    lead:
      row.leadId === null || row.leadStatus === null
        ? null
        : { id: row.leadId, status: row.leadStatus },
    offer:
      row.offerId === null ||
      row.offerNumber === null ||
      row.offerStatus === null
        ? null
        : {
            id: row.offerId,
            offerNumber: row.offerNumber,
            status: row.offerStatus,
          },
    reservation:
      row.reservationId === null ||
      row.reservationNumber === null ||
      row.reservationStatus === null
        ? null
        : {
            id: row.reservationId,
            reservationNumber: row.reservationNumber,
            status: row.reservationStatus,
          },
    saleDate: row.saleDate,
    vehiclePrice: row.vehiclePrice,
    discountAmount: row.discountAmount,
    taxAmount: row.taxAmount,
    feeAmount: row.feeAmount,
    totalAmount: row.totalAmount,
    vehicleCostSnapshot: row.vehicleCostSnapshot,
    paymentMethod: row.paymentMethod,
    status: row.status,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    notes: row.notes,
    createdBy: {
      id: row.createdByUserId,
      firstName: row.createdByFirstName,
      lastName: row.createdByLastName,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function reloadSale(
  connection: PoolConnection,
  tenantId: number,
  saleId: number,
): Promise<SaleDetails> {
  const [rows] = await connection.execute<SaleRow[]>(
    `${SALE_SELECT}
     WHERE sale_record.tenant_id = ?
       AND sale_record.id = ?
     LIMIT 1`,
    [tenantId, saleId],
  );
  const sale = rows[0];

  if (!sale) {
    throw new Error("Sale could not be reloaded");
  }

  return mapSale(sale);
}

async function validateCreateReferences(
  connection: PoolConnection,
  input: CreateSaleRepositoryInput,
): Promise<
  | SaleReferenceFailure
  | { outcome: "VALID"; vehicleCost: string; reservationId: number | null }
> {
  const [locationRows] = await connection.execute<IdRow[]>(
    `
      SELECT id
      FROM locations
      WHERE id = ?
        AND tenant_id = ?
        AND status = 'ACTIVE'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [input.locationId, input.tenantId],
  );

  if (!locationRows[0]) {
    return { outcome: "LOCATION_NOT_FOUND" };
  }

  const [customerRows] = await connection.execute<CustomerRow[]>(
    `
      SELECT status
      FROM customers
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [input.customerId, input.tenantId],
  );
  const customer = customerRows[0];

  if (!customer || customer.status === "INACTIVE") {
    return { outcome: "CUSTOMER_NOT_FOUND" };
  }

  if (input.leadId !== null) {
    const [leadRows] = await connection.execute<LeadCustomerRow[]>(
      `
        SELECT customer_id AS customerId
        FROM leads
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [input.leadId, input.tenantId],
    );
    const lead = leadRows[0];

    if (!lead) {
      return { outcome: "LEAD_NOT_FOUND" };
    }

    if (lead.customerId !== input.customerId) {
      return { outcome: "LEAD_CUSTOMER_MISMATCH" };
    }
  }

  const [vehicleRows] = await connection.execute<VehicleReferenceRow[]>(
    `
      SELECT
        location_id AS locationId,
        status,
        purchase_price AS purchasePrice
      FROM vehicles
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [input.vehicleId, input.tenantId],
  );
  const vehicle = vehicleRows[0];

  if (!vehicle) {
    return { outcome: "VEHICLE_NOT_FOUND" };
  }

  if (vehicle.locationId !== input.locationId) {
    return { outcome: "VEHICLE_LOCATION_MISMATCH" };
  }

  if (vehicle.status !== "AVAILABLE" && vehicle.status !== "RESERVED") {
    return {
      outcome: "VEHICLE_UNAVAILABLE",
      currentStatus: vehicle.status,
    };
  }

  if (vehicle.purchasePrice === null) {
    return { outcome: "VEHICLE_COST_MISSING" };
  }

  const [salespersonRows] = await connection.execute<IdRow[]>(
    `
      SELECT id
      FROM users
      WHERE id = ?
        AND tenant_id = ?
        AND status = 'ACTIVE'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [input.salespersonUserId, input.tenantId],
  );

  if (!salespersonRows[0]) {
    return { outcome: "SALESPERSON_NOT_FOUND" };
  }

  if (input.offerId !== null) {
    const [offerRows] = await connection.execute<OfferReferenceRow[]>(
      `
        SELECT
          status,
          location_id AS locationId,
          customer_id AS customerId,
          vehicle_id AS vehicleId,
          lead_id AS leadId
        FROM offers
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.offerId, input.tenantId],
    );
    const offer = offerRows[0];

    if (!offer) {
      return { outcome: "OFFER_NOT_FOUND" };
    }

    if (offer.status !== "ACCEPTED") {
      return { outcome: "OFFER_NOT_ACCEPTED", currentStatus: offer.status };
    }

    if (
      offer.locationId !== input.locationId ||
      offer.customerId !== input.customerId ||
      offer.vehicleId !== input.vehicleId ||
      (input.leadId !== null && offer.leadId !== input.leadId)
    ) {
      return { outcome: "REFERENCE_MISMATCH" };
    }
  }

  let reservation: ReservationReferenceRow | undefined;

  if (input.reservationId !== null) {
    const [reservationRows] =
      await connection.execute<ReservationReferenceRow[]>(
        `
          SELECT
            id,
            status,
            customer_id AS customerId,
            vehicle_id AS vehicleId,
            lead_id AS leadId,
            offer_id AS offerId
          FROM vehicle_reservations
          WHERE id = ?
            AND tenant_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [input.reservationId, input.tenantId],
      );
    reservation = reservationRows[0];

    if (!reservation) {
      return { outcome: "RESERVATION_NOT_FOUND" };
    }

    if (reservation.status !== "ACTIVE") {
      return {
        outcome: "RESERVATION_INACTIVE",
        currentStatus: reservation.status,
      };
    }
  } else {
    const [reservationRows] =
      await connection.execute<ReservationReferenceRow[]>(
        `
          SELECT
            id,
            status,
            customer_id AS customerId,
            vehicle_id AS vehicleId,
            lead_id AS leadId,
            offer_id AS offerId
          FROM vehicle_reservations
          WHERE tenant_id = ?
            AND vehicle_id = ?
            AND status = 'ACTIVE'
            AND expires_at > CURRENT_TIMESTAMP(3)
          ORDER BY reserved_at DESC, id DESC
          LIMIT 1
          FOR UPDATE
        `,
        [input.tenantId, input.vehicleId],
      );
    reservation = reservationRows[0];
  }

  if (reservation) {
    if (
      reservation.customerId !== input.customerId ||
      reservation.vehicleId !== input.vehicleId ||
      (input.leadId !== null && reservation.leadId !== input.leadId) ||
      (input.offerId !== null && reservation.offerId !== input.offerId)
    ) {
      if (
        vehicle.status === "RESERVED" &&
        reservation.customerId !== input.customerId
      ) {
        return { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" };
      }

      return { outcome: "REFERENCE_MISMATCH" };
    }
  } else if (vehicle.status === "RESERVED") {
    return { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" };
  }

  const [pendingRows] = await connection.execute<IdRow[]>(
    `
      SELECT id
      FROM sales
      WHERE tenant_id = ?
        AND vehicle_id = ?
        AND status = 'PENDING'
      LIMIT 1
      FOR UPDATE
    `,
    [input.tenantId, input.vehicleId],
  );

  if (pendingRows[0]) {
    return { outcome: "PENDING_SALE_EXISTS" };
  }

  return {
    outcome: "VALID",
    vehicleCost: vehicle.purchasePrice,
    reservationId: reservation?.id ?? null,
  };
}

export async function listSales(
  input: ListSalesRepositoryInput,
): Promise<SaleListPage> {
  const clauses = ["sale_record.tenant_id = ?"];
  const parameters: Array<number | string | Date> = [input.tenantId];

  const addFilter = (
    column: string,
    value: number | string | undefined,
  ): void => {
    if (value !== undefined) {
      clauses.push(`${column} = ?`);
      parameters.push(value);
    }
  };

  addFilter("sale_record.status", input.status);
  addFilter("sale_record.location_id", input.locationId);
  addFilter("sale_record.customer_id", input.customerId);
  addFilter("sale_record.vehicle_id", input.vehicleId);
  addFilter("sale_record.salesperson_user_id", input.salespersonUserId);

  if (input.dateFrom) {
    clauses.push("sale_record.sale_date >= ?");
    parameters.push(input.dateFrom);
  }

  if (input.dateTo) {
    clauses.push("sale_record.sale_date <= ?");
    parameters.push(input.dateTo);
  }

  const fromAndWhere = `
    FROM sales sale_record
    INNER JOIN locations location_record
      ON location_record.id = sale_record.location_id
      AND location_record.tenant_id = sale_record.tenant_id
    INNER JOIN customers customer
      ON customer.id = sale_record.customer_id
      AND customer.tenant_id = sale_record.tenant_id
    INNER JOIN vehicles vehicle
      ON vehicle.id = sale_record.vehicle_id
      AND vehicle.tenant_id = sale_record.tenant_id
    INNER JOIN users salesperson
      ON salesperson.id = sale_record.salesperson_user_id
      AND salesperson.tenant_id = sale_record.tenant_id
    LEFT JOIN leads lead_record
      ON lead_record.id = sale_record.lead_id
      AND lead_record.tenant_id = sale_record.tenant_id
    LEFT JOIN offers offer_record
      ON offer_record.id = sale_record.offer_id
      AND offer_record.tenant_id = sale_record.tenant_id
    LEFT JOIN vehicle_reservations reservation
      ON reservation.id = sale_record.reservation_id
      AND reservation.tenant_id = sale_record.tenant_id
    INNER JOIN users creator
      ON creator.id = sale_record.created_by_user_id
      AND creator.tenant_id = sale_record.tenant_id
    WHERE ${clauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;
  const [[rows], [countRows]] = await Promise.all([
    database.execute<SaleRow[]>(
      `
        SELECT
          sale_record.id,
          sale_record.sale_number AS saleNumber,
          location_record.id AS locationId,
          location_record.name AS locationName,
          location_record.code AS locationCode,
          customer.id AS customerId,
          customer.first_name AS customerFirstName,
          customer.last_name AS customerLastName,
          customer.company_name AS customerCompanyName,
          customer.phone AS customerPhone,
          vehicle.id AS vehicleId,
          vehicle.stock_number AS vehicleStockNumber,
          vehicle.make AS vehicleMake,
          vehicle.model AS vehicleModel,
          vehicle.model_year AS vehicleModelYear,
          vehicle.status AS vehicleStatus,
          salesperson.id AS salespersonUserId,
          salesperson.first_name AS salespersonFirstName,
          salesperson.last_name AS salespersonLastName,
          lead_record.id AS leadId,
          lead_record.status AS leadStatus,
          offer_record.id AS offerId,
          offer_record.offer_number AS offerNumber,
          offer_record.status AS offerStatus,
          reservation.id AS reservationId,
          reservation.reservation_number AS reservationNumber,
          reservation.status AS reservationStatus,
          sale_record.sale_date AS saleDate,
          sale_record.vehicle_price AS vehiclePrice,
          sale_record.discount_amount AS discountAmount,
          sale_record.tax_amount AS taxAmount,
          sale_record.fee_amount AS feeAmount,
          sale_record.total_amount AS totalAmount,
          sale_record.vehicle_cost_snapshot AS vehicleCostSnapshot,
          sale_record.payment_method AS paymentMethod,
          sale_record.status,
          sale_record.completed_at AS completedAt,
          sale_record.cancelled_at AS cancelledAt,
          sale_record.cancellation_reason AS cancellationReason,
          sale_record.notes,
          creator.id AS createdByUserId,
          creator.first_name AS createdByFirstName,
          creator.last_name AS createdByLastName,
          sale_record.created_at AS createdAt,
          sale_record.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY sale_record.sale_date DESC, sale_record.id DESC
        LIMIT ${input.limit} OFFSET ${offset}
      `,
      parameters,
    ),
    database.execute<CountRow[]>(
      `SELECT COUNT(*) AS total ${fromAndWhere}`,
      parameters,
    ),
  ]);
  const total = Number(countRows[0]?.total ?? 0);

  return {
    sales: rows.map(mapSale),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function getSaleById(
  tenantId: number,
  saleId: number,
): Promise<SaleDetails | null> {
  const [rows] = await database.execute<SaleRow[]>(
    `${SALE_SELECT}
     WHERE sale_record.tenant_id = ?
       AND sale_record.id = ?
     LIMIT 1`,
    [tenantId, saleId],
  );

  return rows[0] ? mapSale(rows[0]) : null;
}

export async function createSale(
  input: CreateSaleRepositoryInput,
): Promise<CreateSaleRepositoryResult> {
  await expireStaleReservations(input.tenantId);
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const validation = await validateCreateReferences(connection, input);

    if (validation.outcome !== "VALID") {
      await connection.rollback();
      return validation;
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO sales (
          tenant_id,
          location_id,
          sale_number,
          customer_id,
          vehicle_id,
          salesperson_user_id,
          lead_id,
          offer_id,
          reservation_id,
          sale_date,
          vehicle_price,
          discount_amount,
          tax_amount,
          fee_amount,
          vehicle_cost_snapshot,
          payment_method,
          status,
          notes,
          created_by_user_id
        )
        VALUES (
          ?, ?, CONCAT('SALE-', UPPER(REPLACE(UUID(), '-', ''))),
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?
        )
      `,
      [
        input.tenantId,
        input.locationId,
        input.customerId,
        input.vehicleId,
        input.salespersonUserId,
        input.leadId,
        input.offerId,
        validation.reservationId,
        input.saleDate,
        input.vehiclePrice,
        input.discountAmount,
        input.taxAmount,
        input.feeAmount,
        validation.vehicleCost,
        input.paymentMethod,
        input.notes,
        input.createdByUserId,
      ],
    );
    const sale = await reloadSale(
      connection,
      input.tenantId,
      insertResult.insertId,
    );
    await connection.commit();

    return { outcome: "CREATED", sale };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSale(
  input: UpdateSaleRepositoryInput,
): Promise<UpdateSaleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.execute<SaleStateRow[]>(
      `
        SELECT
          status,
          customer_id AS customerId,
          vehicle_id AS vehicleId,
          lead_id AS leadId,
          offer_id AS offerId,
          reservation_id AS reservationId,
          vehicle_price AS vehiclePrice,
          discount_amount AS discountAmount,
          tax_amount AS taxAmount,
          fee_amount AS feeAmount
        FROM sales
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.saleId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (state.status !== "PENDING") {
      await connection.rollback();
      return { outcome: "INVALID_STATE", currentStatus: state.status };
    }

    const vehiclePrice = Number(
      input.changes.vehiclePrice ?? state.vehiclePrice,
    );
    const discountAmount = Number(
      input.changes.discountAmount ?? state.discountAmount,
    );
    const taxAmount = Number(input.changes.taxAmount ?? state.taxAmount);
    const feeAmount = Number(input.changes.feeAmount ?? state.feeAmount);
    const totalAmount = vehiclePrice - discountAmount + taxAmount + feeAmount;

    if (discountAmount > vehiclePrice || totalAmount > 9_999_999_999.99) {
      await connection.rollback();
      return { outcome: "INVALID_AMOUNTS" };
    }

    const assignments: string[] = [];
    const values: Array<string | Date | null | number> = [];
    const columns: Record<keyof UpdateSaleRepositoryInput["changes"], string> = {
      saleDate: "sale_date",
      vehiclePrice: "vehicle_price",
      discountAmount: "discount_amount",
      taxAmount: "tax_amount",
      feeAmount: "fee_amount",
      paymentMethod: "payment_method",
      notes: "notes",
    };

    for (const [field, column] of Object.entries(columns) as Array<
      [keyof typeof columns, string]
    >) {
      if (field in input.changes) {
        assignments.push(`${column} = ?`);
        values.push(input.changes[field] ?? null);
      }
    }

    assignments.push("updated_at = CURRENT_TIMESTAMP(3)");
    await connection.execute<ResultSetHeader>(
      `
        UPDATE sales
        SET ${assignments.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'PENDING'
      `,
      [...values, input.saleId, input.tenantId],
    );
    const sale = await reloadSale(connection, input.tenantId, input.saleId);
    await connection.commit();

    return { outcome: "UPDATED", sale };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSaleStatus(
  input: UpdateSaleStatusRepositoryInput,
): Promise<UpdateSaleStatusRepositoryResult> {
  await expireStaleReservations(input.tenantId);
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.execute<SaleStateRow[]>(
      `
        SELECT
          status,
          customer_id AS customerId,
          vehicle_id AS vehicleId,
          lead_id AS leadId,
          offer_id AS offerId,
          reservation_id AS reservationId,
          vehicle_price AS vehiclePrice,
          discount_amount AS discountAmount,
          tax_amount AS taxAmount,
          fee_amount AS feeAmount
        FROM sales
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.saleId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (state.status !== "PENDING") {
      await connection.rollback();
      return {
        outcome: "INVALID_TRANSITION",
        currentStatus: state.status,
      };
    }

    if (input.status === "CANCELLED") {
      const [cancelResult] = await connection.execute<ResultSetHeader>(
        `
          UPDATE sales
          SET status = 'CANCELLED',
              cancelled_at = CURRENT_TIMESTAMP(3),
              cancellation_reason = ?,
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'PENDING'
        `,
        [input.cancellationReason, input.saleId, input.tenantId],
      );

      if (cancelResult.affectedRows !== 1) {
        throw new Error("Pending sale could not be cancelled");
      }

      const sale = await reloadSale(connection, input.tenantId, input.saleId);
      await connection.commit();

      return { outcome: "UPDATED", sale };
    }

    const [customerRows] = await connection.execute<CustomerRow[]>(
      `
        SELECT status
        FROM customers
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [state.customerId, input.tenantId],
    );

    if (!customerRows[0] || customerRows[0].status === "INACTIVE") {
      await connection.rollback();
      return { outcome: "CUSTOMER_INACTIVE" };
    }

    if (state.offerId !== null) {
      const [offerRows] = await connection.execute<
        Array<RowDataPacket & { status: OfferStatus }>
      >(
        `
          SELECT status
          FROM offers
          WHERE id = ?
            AND tenant_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [state.offerId, input.tenantId],
      );
      const offerStatus = offerRows[0]?.status;

      if (!offerStatus || offerStatus !== "ACCEPTED") {
        await connection.rollback();
        return {
          outcome: "OFFER_NOT_ACCEPTED",
          currentStatus: offerStatus ?? "CANCELLED",
        };
      }
    }

    const [vehicleRows] = await connection.execute<VehicleReferenceRow[]>(
      `
        SELECT
          location_id AS locationId,
          status,
          purchase_price AS purchasePrice
        FROM vehicles
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [state.vehicleId, input.tenantId],
    );
    const vehicle = vehicleRows[0];

    if (
      !vehicle ||
      (vehicle.status !== "AVAILABLE" && vehicle.status !== "RESERVED")
    ) {
      await connection.rollback();
      return {
        outcome: "VEHICLE_UNAVAILABLE",
        currentStatus: vehicle?.status ?? "ARCHIVED",
      };
    }

    let reservation: ReservationReferenceRow | undefined;

    if (state.reservationId !== null) {
      const [reservationRows] =
        await connection.execute<ReservationReferenceRow[]>(
          `
            SELECT
              id,
              status,
              customer_id AS customerId,
              vehicle_id AS vehicleId,
              lead_id AS leadId,
              offer_id AS offerId
            FROM vehicle_reservations
            WHERE id = ?
              AND tenant_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [state.reservationId, input.tenantId],
        );
      reservation = reservationRows[0];

      if (!reservation || reservation.status !== "ACTIVE") {
        await connection.rollback();
        return {
          outcome: "RESERVATION_INACTIVE",
          currentStatus: reservation?.status ?? "EXPIRED",
        };
      }
    } else {
      const [reservationRows] =
        await connection.execute<ReservationReferenceRow[]>(
          `
            SELECT
              id,
              status,
              customer_id AS customerId,
              vehicle_id AS vehicleId,
              lead_id AS leadId,
              offer_id AS offerId
            FROM vehicle_reservations
            WHERE tenant_id = ?
              AND vehicle_id = ?
              AND status = 'ACTIVE'
              AND expires_at > CURRENT_TIMESTAMP(3)
            ORDER BY reserved_at DESC, id DESC
            LIMIT 1
            FOR UPDATE
          `,
          [input.tenantId, state.vehicleId],
        );
      reservation = reservationRows[0];
    }

    if (reservation && reservation.customerId !== state.customerId) {
      await connection.rollback();
      return { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" };
    }

    if (vehicle.status === "RESERVED" && !reservation) {
      await connection.rollback();
      return { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" };
    }

    if (reservation && state.reservationId === null) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE sales
          SET reservation_id = ?
          WHERE id = ?
            AND tenant_id = ?
        `,
        [reservation.id, input.saleId, input.tenantId],
      );
    }

    const [saleResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE sales
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP(3),
            cancellation_reason = NULL,
            cancelled_at = NULL,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'PENDING'
      `,
      [input.saleId, input.tenantId],
    );

    if (saleResult.affectedRows !== 1) {
      throw new Error("Pending sale could not be completed");
    }

    const [vehicleResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE vehicles
        SET status = 'SOLD',
            updated_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND status IN ('AVAILABLE', 'RESERVED')
          AND deleted_at IS NULL
      `,
      [input.updatedByUserId, state.vehicleId, input.tenantId],
    );

    if (vehicleResult.affectedRows !== 1) {
      throw new Error("Sold vehicle status could not be synchronized");
    }

    if (reservation) {
      const [reservationResult] = await connection.execute<ResultSetHeader>(
        `
          UPDATE vehicle_reservations
          SET status = 'CONVERTED',
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
        `,
        [reservation.id, input.tenantId],
      );

      if (reservationResult.affectedRows !== 1) {
        throw new Error("Converted reservation status could not be synchronized");
      }
    }

    if (state.leadId !== null) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE leads
          SET status = 'WON',
              converted_at = COALESCE(converted_at, CURRENT_TIMESTAMP(3)),
              next_follow_up_at = NULL,
              lost_reason = NULL,
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND deleted_at IS NULL
        `,
        [state.leadId, input.tenantId],
      );
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE customers
        SET status = 'CUSTOMER',
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'PROSPECT'
          AND deleted_at IS NULL
      `,
      [state.customerId, input.tenantId],
    );

    const sale = await reloadSale(connection, input.tenantId, input.saleId);
    await connection.commit();

    return { outcome: "UPDATED", sale };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
