import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { database } from "../../config/database.js";
import type {
  VehicleReservationStatus,
  VehicleStatus,
} from "../inventory/inventory.repository.js";
import type { LeadStatus } from "../crm/crm.repository.js";
import type { OfferStatus } from "./offer.repository.js";

export interface ReservationDetails {
  id: number;
  reservationNumber: string;
  vehicle: {
    id: number;
    stockNumber: string;
    make: string;
    model: string;
    modelYear: number;
    status: VehicleStatus;
  };
  customer: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string;
  };
  lead: { id: number; status: LeadStatus } | null;
  offer: { id: number; offerNumber: string; status: OfferStatus } | null;
  salesperson: { id: number; firstName: string; lastName: string };
  agreedPrice: string | null;
  status: VehicleReservationStatus;
  reservedAt: Date;
  expiresAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdBy: { id: number; firstName: string; lastName: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationListPage {
  reservations: ReservationDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListReservationsRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: VehicleReservationStatus;
  customerId?: number;
  leadId?: number;
  vehicleId?: number;
  salespersonUserId?: number;
  expiresFrom?: Date;
  expiresTo?: Date;
}

export interface UpdateReservationRepositoryInput {
  tenantId: number;
  reservationId: number;
  changes: {
    agreedPrice?: string | null;
    expiresAt?: Date;
    notes?: string | null;
  };
}

export type UpdateReservationRepositoryResult =
  | { outcome: "UPDATED"; reservation: ReservationDetails }
  | { outcome: "NOT_FOUND" }
  | {
      outcome: "INVALID_STATE";
      currentStatus: VehicleReservationStatus;
    };

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface ExpiredReservationRow extends RowDataPacket {
  id: number;
  vehicleId: number;
}

interface ReservationStateRow extends RowDataPacket {
  status: VehicleReservationStatus;
}

interface ReservationRow extends RowDataPacket {
  id: number;
  reservationNumber: string;
  vehicleId: number;
  vehicleStockNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleModelYear: number;
  vehicleStatus: VehicleStatus;
  customerId: number;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCompanyName: string | null;
  customerPhone: string;
  leadId: number | null;
  leadStatus: LeadStatus | null;
  offerId: number | null;
  offerNumber: string | null;
  offerStatus: OfferStatus | null;
  salespersonUserId: number;
  salespersonFirstName: string;
  salespersonLastName: string;
  agreedPrice: string | null;
  status: VehicleReservationStatus;
  reservedAt: Date;
  expiresAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByFirstName: string;
  createdByLastName: string;
  createdAt: Date;
  updatedAt: Date;
}

const RESERVATION_SELECT = `
  SELECT
    reservation.id,
    reservation.reservation_number AS reservationNumber,
    vehicle.id AS vehicleId,
    vehicle.stock_number AS vehicleStockNumber,
    vehicle.make AS vehicleMake,
    vehicle.model AS vehicleModel,
    vehicle.model_year AS vehicleModelYear,
    vehicle.status AS vehicleStatus,
    customer.id AS customerId,
    customer.first_name AS customerFirstName,
    customer.last_name AS customerLastName,
    customer.company_name AS customerCompanyName,
    customer.phone AS customerPhone,
    lead_record.id AS leadId,
    lead_record.status AS leadStatus,
    offer_record.id AS offerId,
    offer_record.offer_number AS offerNumber,
    offer_record.status AS offerStatus,
    salesperson.id AS salespersonUserId,
    salesperson.first_name AS salespersonFirstName,
    salesperson.last_name AS salespersonLastName,
    reservation.agreed_price AS agreedPrice,
    reservation.status,
    reservation.reserved_at AS reservedAt,
    reservation.expires_at AS expiresAt,
    reservation.cancelled_at AS cancelledAt,
    reservation.cancellation_reason AS cancellationReason,
    reservation.notes,
    creator.id AS createdByUserId,
    creator.first_name AS createdByFirstName,
    creator.last_name AS createdByLastName,
    reservation.created_at AS createdAt,
    reservation.updated_at AS updatedAt
  FROM vehicle_reservations reservation
  INNER JOIN vehicles vehicle
    ON vehicle.id = reservation.vehicle_id
    AND vehicle.tenant_id = reservation.tenant_id
  INNER JOIN customers customer
    ON customer.id = reservation.customer_id
    AND customer.tenant_id = reservation.tenant_id
  LEFT JOIN leads lead_record
    ON lead_record.id = reservation.lead_id
    AND lead_record.tenant_id = reservation.tenant_id
  LEFT JOIN offers offer_record
    ON offer_record.id = reservation.offer_id
    AND offer_record.tenant_id = reservation.tenant_id
  INNER JOIN users salesperson
    ON salesperson.id = reservation.salesperson_user_id
    AND salesperson.tenant_id = reservation.tenant_id
  INNER JOIN users creator
    ON creator.id = reservation.created_by_user_id
    AND creator.tenant_id = reservation.tenant_id
`;

function mapReservation(row: ReservationRow): ReservationDetails {
  return {
    id: row.id,
    reservationNumber: row.reservationNumber,
    vehicle: {
      id: row.vehicleId,
      stockNumber: row.vehicleStockNumber,
      make: row.vehicleMake,
      model: row.vehicleModel,
      modelYear: row.vehicleModelYear,
      status: row.vehicleStatus,
    },
    customer: {
      id: row.customerId,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      companyName: row.customerCompanyName,
      phone: row.customerPhone,
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
    salesperson: {
      id: row.salespersonUserId,
      firstName: row.salespersonFirstName,
      lastName: row.salespersonLastName,
    },
    agreedPrice: row.agreedPrice,
    status: row.status,
    reservedAt: row.reservedAt,
    expiresAt: row.expiresAt,
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

async function expireReservationsWithConnection(
  connection: PoolConnection,
  tenantId: number,
): Promise<void> {
  const [expiredRows] =
    await connection.execute<ExpiredReservationRow[]>(
      `
        SELECT id, vehicle_id AS vehicleId
        FROM vehicle_reservations
        WHERE tenant_id = ?
          AND status = 'ACTIVE'
          AND expires_at <= CURRENT_TIMESTAMP(3)
        FOR UPDATE
      `,
      [tenantId],
    );

  if (expiredRows.length === 0) {
    return;
  }

  const ids = expiredRows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  await connection.execute<ResultSetHeader>(
    `
      UPDATE vehicle_reservations
      SET status = 'EXPIRED',
          updated_at = CURRENT_TIMESTAMP(3)
      WHERE tenant_id = ?
        AND id IN (${placeholders})
        AND status = 'ACTIVE'
    `,
    [tenantId, ...ids],
  );

  const vehicleIds = [...new Set(expiredRows.map((row) => row.vehicleId))];
  const vehiclePlaceholders = vehicleIds.map(() => "?").join(", ");
  await connection.execute<ResultSetHeader>(
    `
      UPDATE vehicles vehicle
      SET vehicle.status = 'AVAILABLE',
          vehicle.updated_at = CURRENT_TIMESTAMP(3)
      WHERE vehicle.tenant_id = ?
        AND vehicle.id IN (${vehiclePlaceholders})
        AND vehicle.status = 'RESERVED'
        AND vehicle.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM vehicle_reservations active_reservation
          WHERE active_reservation.tenant_id = vehicle.tenant_id
            AND active_reservation.vehicle_id = vehicle.id
            AND active_reservation.status = 'ACTIVE'
            AND active_reservation.expires_at > CURRENT_TIMESTAMP(3)
        )
    `,
    [tenantId, ...vehicleIds],
  );
}

export async function expireStaleReservations(tenantId: number): Promise<void> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    await expireReservationsWithConnection(connection, tenantId);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reloadReservation(
  connection: PoolConnection,
  tenantId: number,
  reservationId: number,
): Promise<ReservationDetails> {
  const [rows] = await connection.execute<ReservationRow[]>(
    `${RESERVATION_SELECT}
     WHERE reservation.tenant_id = ?
       AND reservation.id = ?
     LIMIT 1`,
    [tenantId, reservationId],
  );
  const reservation = rows[0];

  if (!reservation) {
    throw new Error("Reservation could not be reloaded");
  }

  return mapReservation(reservation);
}

export async function listReservations(
  input: ListReservationsRepositoryInput,
): Promise<ReservationListPage> {
  await expireStaleReservations(input.tenantId);
  const clauses = ["reservation.tenant_id = ?"];
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

  addFilter("reservation.status", input.status);
  addFilter("reservation.customer_id", input.customerId);
  addFilter("reservation.lead_id", input.leadId);
  addFilter("reservation.vehicle_id", input.vehicleId);
  addFilter("reservation.salesperson_user_id", input.salespersonUserId);

  if (input.expiresFrom) {
    clauses.push("reservation.expires_at >= ?");
    parameters.push(input.expiresFrom);
  }

  if (input.expiresTo) {
    clauses.push("reservation.expires_at <= ?");
    parameters.push(input.expiresTo);
  }

  const fromAndWhere = `
    FROM vehicle_reservations reservation
    INNER JOIN vehicles vehicle
      ON vehicle.id = reservation.vehicle_id
      AND vehicle.tenant_id = reservation.tenant_id
    INNER JOIN customers customer
      ON customer.id = reservation.customer_id
      AND customer.tenant_id = reservation.tenant_id
    LEFT JOIN leads lead_record
      ON lead_record.id = reservation.lead_id
      AND lead_record.tenant_id = reservation.tenant_id
    LEFT JOIN offers offer_record
      ON offer_record.id = reservation.offer_id
      AND offer_record.tenant_id = reservation.tenant_id
    INNER JOIN users salesperson
      ON salesperson.id = reservation.salesperson_user_id
      AND salesperson.tenant_id = reservation.tenant_id
    INNER JOIN users creator
      ON creator.id = reservation.created_by_user_id
      AND creator.tenant_id = reservation.tenant_id
    WHERE ${clauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;
  const [[rows], [countRows]] = await Promise.all([
    database.execute<ReservationRow[]>(
      `
        SELECT
          reservation.id,
          reservation.reservation_number AS reservationNumber,
          vehicle.id AS vehicleId,
          vehicle.stock_number AS vehicleStockNumber,
          vehicle.make AS vehicleMake,
          vehicle.model AS vehicleModel,
          vehicle.model_year AS vehicleModelYear,
          vehicle.status AS vehicleStatus,
          customer.id AS customerId,
          customer.first_name AS customerFirstName,
          customer.last_name AS customerLastName,
          customer.company_name AS customerCompanyName,
          customer.phone AS customerPhone,
          lead_record.id AS leadId,
          lead_record.status AS leadStatus,
          offer_record.id AS offerId,
          offer_record.offer_number AS offerNumber,
          offer_record.status AS offerStatus,
          salesperson.id AS salespersonUserId,
          salesperson.first_name AS salespersonFirstName,
          salesperson.last_name AS salespersonLastName,
          reservation.agreed_price AS agreedPrice,
          reservation.status,
          reservation.reserved_at AS reservedAt,
          reservation.expires_at AS expiresAt,
          reservation.cancelled_at AS cancelledAt,
          reservation.cancellation_reason AS cancellationReason,
          reservation.notes,
          creator.id AS createdByUserId,
          creator.first_name AS createdByFirstName,
          creator.last_name AS createdByLastName,
          reservation.created_at AS createdAt,
          reservation.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY
          CASE WHEN reservation.status = 'ACTIVE' THEN 0 ELSE 1 END,
          reservation.expires_at ASC,
          reservation.id DESC
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
    reservations: rows.map(mapReservation),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function getReservationById(
  tenantId: number,
  reservationId: number,
): Promise<ReservationDetails | null> {
  await expireStaleReservations(tenantId);
  const [rows] = await database.execute<ReservationRow[]>(
    `${RESERVATION_SELECT}
     WHERE reservation.tenant_id = ?
       AND reservation.id = ?
     LIMIT 1`,
    [tenantId, reservationId],
  );

  return rows[0] ? mapReservation(rows[0]) : null;
}

export async function updateReservation(
  input: UpdateReservationRepositoryInput,
): Promise<UpdateReservationRepositoryResult> {
  await expireStaleReservations(input.tenantId);
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.execute<ReservationStateRow[]>(
      `
        SELECT status
        FROM vehicle_reservations
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.reservationId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (state.status !== "ACTIVE") {
      await connection.rollback();
      return { outcome: "INVALID_STATE", currentStatus: state.status };
    }

    const assignments: string[] = [];
    const values: Array<string | Date | null | number> = [];
    const columns: Record<
      keyof UpdateReservationRepositoryInput["changes"],
      string
    > = {
      agreedPrice: "agreed_price",
      expiresAt: "expires_at",
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
        UPDATE vehicle_reservations
        SET ${assignments.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'ACTIVE'
      `,
      [...values, input.reservationId, input.tenantId],
    );
    const reservation = await reloadReservation(
      connection,
      input.tenantId,
      input.reservationId,
    );
    await connection.commit();

    return { outcome: "UPDATED", reservation };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
