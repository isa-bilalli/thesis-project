import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { database } from "../../config/database.js";
import type { VehicleStatus } from "../inventory/inventory.repository.js";
import type { LeadStatus } from "../crm/crm.repository.js";

export type OfferStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export interface OfferDetails {
  id: number;
  offerNumber: string;
  location: { id: number; name: string; code: string };
  lead: { id: number; status: LeadStatus } | null;
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
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  totalAmount: string;
  status: OfferStatus;
  validUntil: Date | null;
  sentAt: Date | null;
  respondedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferListPage {
  offers: OfferDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListOffersRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: OfferStatus;
  locationId?: number;
  customerId?: number;
  leadId?: number;
  vehicleId?: number;
  salespersonUserId?: number;
}

export interface CreateOfferRepositoryInput {
  tenantId: number;
  locationId: number;
  leadId: number | null;
  customerId: number;
  vehicleId: number;
  salespersonUserId: number;
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  validUntil: Date | null;
  notes: string | null;
}

export interface UpdateOfferRepositoryInput {
  tenantId: number;
  offerId: number;
  changes: {
    vehiclePrice?: string;
    discountAmount?: string;
    taxAmount?: string;
    feeAmount?: string;
    validUntil?: Date | null;
    notes?: string | null;
  };
}

export interface UpdateOfferStatusRepositoryInput {
  tenantId: number;
  offerId: number;
  status: "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
}

type OfferReferenceFailure =
  | { outcome: "LOCATION_NOT_FOUND" }
  | { outcome: "CUSTOMER_NOT_FOUND" }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "LEAD_CUSTOMER_MISMATCH" }
  | { outcome: "VEHICLE_NOT_FOUND" }
  | { outcome: "VEHICLE_LOCATION_MISMATCH" }
  | { outcome: "VEHICLE_UNAVAILABLE"; currentStatus: VehicleStatus }
  | { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" }
  | { outcome: "SALESPERSON_NOT_FOUND" };

export type CreateOfferRepositoryResult =
  | { outcome: "CREATED"; offer: OfferDetails }
  | OfferReferenceFailure;

export type UpdateOfferRepositoryResult =
  | { outcome: "UPDATED"; offer: OfferDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_STATE"; currentStatus: OfferStatus }
  | { outcome: "INVALID_AMOUNTS" };

export type UpdateOfferStatusRepositoryResult =
  | { outcome: "UPDATED"; offer: OfferDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: OfferStatus }
  | { outcome: "OFFER_EXPIRED" }
  | { outcome: "VEHICLE_UNAVAILABLE"; currentStatus: VehicleStatus }
  | { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" }
  | { outcome: "ANOTHER_OFFER_ACCEPTED" };

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface LeadCustomerRow extends RowDataPacket {
  customerId: number;
}

interface VehicleReferenceRow extends RowDataPacket {
  locationId: number;
  status: VehicleStatus;
}

interface ReservationCustomerRow extends RowDataPacket {
  customerId: number;
}

interface OfferStateRow extends RowDataPacket {
  status: OfferStatus;
  vehicleId: number;
  customerId: number;
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  validUntil: Date | null;
}

interface OfferRow extends RowDataPacket {
  id: number;
  offerNumber: string;
  locationId: number;
  locationName: string;
  locationCode: string;
  leadId: number | null;
  leadStatus: LeadStatus | null;
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
  vehiclePrice: string;
  discountAmount: string;
  taxAmount: string;
  feeAmount: string;
  totalAmount: string;
  status: OfferStatus;
  validUntil: Date | null;
  sentAt: Date | null;
  respondedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OFFER_SELECT = `
  SELECT
    offer_record.id,
    offer_record.offer_number AS offerNumber,
    location_record.id AS locationId,
    location_record.name AS locationName,
    location_record.code AS locationCode,
    lead_record.id AS leadId,
    lead_record.status AS leadStatus,
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
    offer_record.vehicle_price AS vehiclePrice,
    offer_record.discount_amount AS discountAmount,
    offer_record.tax_amount AS taxAmount,
    offer_record.fee_amount AS feeAmount,
    offer_record.total_amount AS totalAmount,
    offer_record.status,
    offer_record.valid_until AS validUntil,
    offer_record.sent_at AS sentAt,
    offer_record.responded_at AS respondedAt,
    offer_record.notes,
    offer_record.created_at AS createdAt,
    offer_record.updated_at AS updatedAt
  FROM offers offer_record
  INNER JOIN locations location_record
    ON location_record.id = offer_record.location_id
    AND location_record.tenant_id = offer_record.tenant_id
  LEFT JOIN leads lead_record
    ON lead_record.id = offer_record.lead_id
    AND lead_record.tenant_id = offer_record.tenant_id
  INNER JOIN customers customer
    ON customer.id = offer_record.customer_id
    AND customer.tenant_id = offer_record.tenant_id
  INNER JOIN vehicles vehicle
    ON vehicle.id = offer_record.vehicle_id
    AND vehicle.tenant_id = offer_record.tenant_id
  INNER JOIN users salesperson
    ON salesperson.id = offer_record.salesperson_user_id
    AND salesperson.tenant_id = offer_record.tenant_id
`;

function mapOffer(row: OfferRow): OfferDetails {
  return {
    id: row.id,
    offerNumber: row.offerNumber,
    location: {
      id: row.locationId,
      name: row.locationName,
      code: row.locationCode,
    },
    lead:
      row.leadId === null || row.leadStatus === null
        ? null
        : { id: row.leadId, status: row.leadStatus },
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
    vehiclePrice: row.vehiclePrice,
    discountAmount: row.discountAmount,
    taxAmount: row.taxAmount,
    feeAmount: row.feeAmount,
    totalAmount: row.totalAmount,
    status: row.status,
    validUntil: row.validUntil,
    sentAt: row.sentAt,
    respondedAt: row.respondedAt,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function expireStaleOffers(tenantId: number): Promise<void> {
  await database.execute(
    `
      UPDATE offers
      SET status = 'EXPIRED',
          responded_at = COALESCE(responded_at, CURRENT_TIMESTAMP(3)),
          updated_at = CURRENT_TIMESTAMP(3)
      WHERE tenant_id = ?
        AND status = 'SENT'
        AND valid_until IS NOT NULL
        AND valid_until <= CURRENT_TIMESTAMP(3)
    `,
    [tenantId],
  );
}

async function expireOfferInTransaction(
  connection: PoolConnection,
  tenantId: number,
  offerId: number,
): Promise<void> {
  await connection.execute(
    `
      UPDATE offers
      SET status = 'EXPIRED',
          responded_at = COALESCE(responded_at, CURRENT_TIMESTAMP(3)),
          updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
        AND tenant_id = ?
        AND status = 'SENT'
        AND valid_until IS NOT NULL
        AND valid_until <= CURRENT_TIMESTAMP(3)
    `,
    [offerId, tenantId],
  );
}

async function reloadOffer(
  connection: PoolConnection,
  tenantId: number,
  offerId: number,
): Promise<OfferDetails> {
  const [rows] = await connection.execute<OfferRow[]>(
    `${OFFER_SELECT}
     WHERE offer_record.tenant_id = ?
       AND offer_record.id = ?
     LIMIT 1`,
    [tenantId, offerId],
  );
  const offer = rows[0];

  if (!offer) {
    throw new Error("Offer could not be reloaded");
  }

  return mapOffer(offer);
}

async function validateOfferReferences(
  connection: PoolConnection,
  input: CreateOfferRepositoryInput,
): Promise<OfferReferenceFailure | null> {
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

  const [customerRows] = await connection.execute<IdRow[]>(
    `
      SELECT id
      FROM customers
      WHERE id = ?
        AND tenant_id = ?
        AND status <> 'INACTIVE'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [input.customerId, input.tenantId],
  );

  if (!customerRows[0]) {
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
      SELECT location_id AS locationId, status
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

  if (vehicle.status === "RESERVED") {
    const [reservationRows] =
      await connection.execute<ReservationCustomerRow[]>(
        `
          SELECT customer_id AS customerId
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

    if (reservationRows[0]?.customerId !== input.customerId) {
      return { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" };
    }
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

  return null;
}

export async function listOffers(
  input: ListOffersRepositoryInput,
): Promise<OfferListPage> {
  await expireStaleOffers(input.tenantId);
  const clauses = ["offer_record.tenant_id = ?"];
  const parameters: Array<number | string> = [input.tenantId];

  const addFilter = (
    column: string,
    value: number | string | undefined,
  ): void => {
    if (value !== undefined) {
      clauses.push(`${column} = ?`);
      parameters.push(value);
    }
  };

  addFilter("offer_record.status", input.status);
  addFilter("offer_record.location_id", input.locationId);
  addFilter("offer_record.customer_id", input.customerId);
  addFilter("offer_record.lead_id", input.leadId);
  addFilter("offer_record.vehicle_id", input.vehicleId);
  addFilter("offer_record.salesperson_user_id", input.salespersonUserId);

  const fromAndWhere = `
    FROM offers offer_record
    INNER JOIN locations location_record
      ON location_record.id = offer_record.location_id
      AND location_record.tenant_id = offer_record.tenant_id
    LEFT JOIN leads lead_record
      ON lead_record.id = offer_record.lead_id
      AND lead_record.tenant_id = offer_record.tenant_id
    INNER JOIN customers customer
      ON customer.id = offer_record.customer_id
      AND customer.tenant_id = offer_record.tenant_id
    INNER JOIN vehicles vehicle
      ON vehicle.id = offer_record.vehicle_id
      AND vehicle.tenant_id = offer_record.tenant_id
    INNER JOIN users salesperson
      ON salesperson.id = offer_record.salesperson_user_id
      AND salesperson.tenant_id = offer_record.tenant_id
    WHERE ${clauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;
  const [[rows], [countRows]] = await Promise.all([
    database.execute<OfferRow[]>(
      `
        SELECT
          offer_record.id,
          offer_record.offer_number AS offerNumber,
          location_record.id AS locationId,
          location_record.name AS locationName,
          location_record.code AS locationCode,
          lead_record.id AS leadId,
          lead_record.status AS leadStatus,
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
          offer_record.vehicle_price AS vehiclePrice,
          offer_record.discount_amount AS discountAmount,
          offer_record.tax_amount AS taxAmount,
          offer_record.fee_amount AS feeAmount,
          offer_record.total_amount AS totalAmount,
          offer_record.status,
          offer_record.valid_until AS validUntil,
          offer_record.sent_at AS sentAt,
          offer_record.responded_at AS respondedAt,
          offer_record.notes,
          offer_record.created_at AS createdAt,
          offer_record.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY offer_record.created_at DESC, offer_record.id DESC
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
    offers: rows.map(mapOffer),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function getOfferById(
  tenantId: number,
  offerId: number,
): Promise<OfferDetails | null> {
  await expireStaleOffers(tenantId);
  const [rows] = await database.execute<OfferRow[]>(
    `${OFFER_SELECT}
     WHERE offer_record.tenant_id = ?
       AND offer_record.id = ?
     LIMIT 1`,
    [tenantId, offerId],
  );

  return rows[0] ? mapOffer(rows[0]) : null;
}

export async function createOffer(
  input: CreateOfferRepositoryInput,
): Promise<CreateOfferRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const failure = await validateOfferReferences(connection, input);

    if (failure) {
      await connection.rollback();
      return failure;
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO offers (
          tenant_id,
          location_id,
          offer_number,
          lead_id,
          customer_id,
          vehicle_id,
          salesperson_user_id,
          vehicle_price,
          discount_amount,
          tax_amount,
          fee_amount,
          status,
          valid_until,
          notes
        )
        VALUES (
          ?, ?, CONCAT('OFF-', UPPER(REPLACE(UUID(), '-', ''))),
          ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?
        )
      `,
      [
        input.tenantId,
        input.locationId,
        input.leadId,
        input.customerId,
        input.vehicleId,
        input.salespersonUserId,
        input.vehiclePrice,
        input.discountAmount,
        input.taxAmount,
        input.feeAmount,
        input.validUntil,
        input.notes,
      ],
    );
    const offer = await reloadOffer(
      connection,
      input.tenantId,
      insertResult.insertId,
    );
    await connection.commit();

    return { outcome: "CREATED", offer };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateOffer(
  input: UpdateOfferRepositoryInput,
): Promise<UpdateOfferRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    await expireOfferInTransaction(connection, input.tenantId, input.offerId);
    const [stateRows] = await connection.execute<OfferStateRow[]>(
      `
        SELECT
          status,
          vehicle_id AS vehicleId,
          customer_id AS customerId,
          vehicle_price AS vehiclePrice,
          discount_amount AS discountAmount,
          tax_amount AS taxAmount,
          fee_amount AS feeAmount,
          valid_until AS validUntil
        FROM offers
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.offerId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (state.status !== "DRAFT") {
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
    const columns: Record<keyof UpdateOfferRepositoryInput["changes"], string> = {
      vehiclePrice: "vehicle_price",
      discountAmount: "discount_amount",
      taxAmount: "tax_amount",
      feeAmount: "fee_amount",
      validUntil: "valid_until",
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
        UPDATE offers
        SET ${assignments.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'DRAFT'
      `,
      [...values, input.offerId, input.tenantId],
    );
    const offer = await reloadOffer(connection, input.tenantId, input.offerId);
    await connection.commit();

    return { outcome: "UPDATED", offer };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateOfferStatus(
  input: UpdateOfferStatusRepositoryInput,
): Promise<UpdateOfferStatusRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    await expireOfferInTransaction(connection, input.tenantId, input.offerId);
    const [stateRows] = await connection.execute<OfferStateRow[]>(
      `
        SELECT
          status,
          vehicle_id AS vehicleId,
          customer_id AS customerId,
          vehicle_price AS vehiclePrice,
          discount_amount AS discountAmount,
          tax_amount AS taxAmount,
          fee_amount AS feeAmount,
          valid_until AS validUntil
        FROM offers
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.offerId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (state.status === "EXPIRED") {
      await connection.rollback();
      return { outcome: "OFFER_EXPIRED" };
    }

    const allowedTransitions: Record<OfferStatus, readonly OfferStatus[]> = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["ACCEPTED", "REJECTED", "CANCELLED"],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[state.status].includes(input.status)) {
      await connection.rollback();
      return {
        outcome: "INVALID_TRANSITION",
        currentStatus: state.status,
      };
    }

    if (
      input.status === "SENT" &&
      state.validUntil !== null &&
      state.validUntil.getTime() <= Date.now()
    ) {
      await connection.rollback();
      return { outcome: "OFFER_EXPIRED" };
    }

    if (input.status === "ACCEPTED") {
      const [vehicleRows] = await connection.execute<
        Array<RowDataPacket & { status: VehicleStatus }>
      >(
        `
          SELECT status
          FROM vehicles
          WHERE id = ?
            AND tenant_id = ?
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [state.vehicleId, input.tenantId],
      );
      const currentStatus = vehicleRows[0]?.status;

      if (
        !currentStatus ||
        (currentStatus !== "AVAILABLE" && currentStatus !== "RESERVED")
      ) {
        await connection.rollback();
        return {
          outcome: "VEHICLE_UNAVAILABLE",
          currentStatus: currentStatus ?? "ARCHIVED",
        };
      }

      if (currentStatus === "RESERVED") {
        const [reservationRows] =
          await connection.execute<ReservationCustomerRow[]>(
            `
              SELECT customer_id AS customerId
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

        if (reservationRows[0]?.customerId !== state.customerId) {
          await connection.rollback();
          return { outcome: "VEHICLE_RESERVED_FOR_ANOTHER_CUSTOMER" };
        }
      }

      const [acceptedRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM offers
          WHERE tenant_id = ?
            AND vehicle_id = ?
            AND status = 'ACCEPTED'
            AND id <> ?
          LIMIT 1
          FOR UPDATE
        `,
        [input.tenantId, state.vehicleId, input.offerId],
      );

      if (acceptedRows[0]) {
        await connection.rollback();
        return { outcome: "ANOTHER_OFFER_ACCEPTED" };
      }
    }

    const timestampAssignments =
      input.status === "SENT"
        ? ", sent_at = CURRENT_TIMESTAMP(3)"
        : ", responded_at = CURRENT_TIMESTAMP(3)";
    await connection.execute<ResultSetHeader>(
      `
        UPDATE offers
        SET status = ?
            ${timestampAssignments},
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
      `,
      [input.status, input.offerId, input.tenantId],
    );
    const offer = await reloadOffer(connection, input.tenantId, input.offerId);
    await connection.commit();

    return { outcome: "UPDATED", offer };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
