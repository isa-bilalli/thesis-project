import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../config/database.js";

export type VehicleCondition = "NEW" | "USED";

export type VehicleStatus =
  | "DRAFT"
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "ARCHIVED";

export interface VehicleListItem {
  id: number;
  location: {
    id: number;
    name: string;
    code: string;
  };
  stockNumber: string;
  vin: string | null;
  condition: VehicleCondition;
  status: VehicleStatus;
  make: string;
  model: string;
  trimLevel: string | null;
  modelYear: number;
  bodyType: string | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  mileageKm: number;
  exteriorColor: string | null;
  askingPrice: string | null;
  primaryImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateVehicleChanges {
  locationId?: number;
  stockNumber?: string;
  vin?: string | null;
  condition?: VehicleCondition;
  make?: string;
  model?: string;
  trimLevel?: string | null;
  modelYear?: number;
  bodyType?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  engineDescription?: string | null;
  mileageKm?: number;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  registrationNumber?: string | null;
  firstRegistrationDate?: string | null;
  acquiredAt?: Date | null;
  purchasePrice?: string | null;
  askingPrice?: string | null;
  minimumPrice?: string | null;
  primaryImageUrl?: string | null;
  description?: string | null;
}

export interface DeleteVehicleRepositoryInput {
  tenantId: number;
  vehicleId: number;
  deletedByUserId: number;
}

export interface RestoreVehicleRepositoryInput {
  tenantId: number;
  vehicleId: number;
  restoredByUserId: number;
}

export type RestoreVehicleRepositoryResult =
  | { outcome: "RESTORED"; vehicle: VehicleDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_STATUS"; currentStatus: VehicleStatus }
  | { outcome: "LOCATION_UNAVAILABLE" };

export type DeleteVehicleRepositoryResult =
  | { outcome: "DELETED" }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_STATUS"; currentStatus: VehicleStatus };

export interface UpdateVehicleRepositoryInput {
  tenantId: number;
  vehicleId: number;
  updatedByUserId: number;
  changes: UpdateVehicleChanges;
}

export type UpdateVehicleRepositoryResult =
  | {
      outcome: "UPDATED";
      vehicle: VehicleDetails;
    }
  | {
      outcome: "NOT_FOUND";
    }
  | {
      outcome: "LOCATION_NOT_FOUND";
    }
  | {
      outcome: "STOCK_NUMBER_CONFLICT";
    }
  | {
      outcome: "VIN_CONFLICT";
    };

export type UpdateVehicleStatusRepositoryResult =
  | { outcome: "UPDATED"; vehicle: VehicleDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: VehicleStatus };

export interface UpdateVehicleStatusRepositoryInput {
  tenantId: number;
  vehicleId: number;
  updatedByUserId: number;
  status: VehicleStatus;
}

export type VehicleReservationStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "CONVERTED";

export interface VehicleReservation {
  id: number;
  reservationNumber: string;
  vehicleId: number;
  customerId: number;
  leadId: number | null;
  offerId: number | null;
  salespersonUserId: number;
  agreedPrice: string | null;
  status: VehicleReservationStatus;
  reservedAt: Date;
  expiresAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReserveVehicleRepositoryInput {
  tenantId: number;
  vehicleId: number;
  customerId: number;
  leadId: number | null;
  offerId: number | null;
  createdByUserId: number;
  agreedPrice: string | null;
  expiresAt: Date;
  notes: string | null;
}

export type ReserveVehicleRepositoryResult =
  | {
      outcome: "CREATED";
      reservation: VehicleReservation;
      vehicle: VehicleDetails;
    }
  | { outcome: "NOT_FOUND" }
  | { outcome: "NOT_AVAILABLE"; currentStatus: VehicleStatus }
  | { outcome: "CUSTOMER_NOT_FOUND" }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "OFFER_NOT_FOUND" };

export interface CancelVehicleReservationRepositoryInput {
  tenantId: number;
  vehicleId: number;
  cancelledByUserId: number;
  cancellationReason: string | null;
}

export type CancelVehicleReservationRepositoryResult =
  | {
      outcome: "CANCELLED";
      reservation: VehicleReservation;
      vehicle: VehicleDetails;
    }
  | { outcome: "NOT_FOUND" }
  | { outcome: "NOT_RESERVED"; currentStatus: VehicleStatus }
  | { outcome: "ACTIVE_RESERVATION_NOT_FOUND" };

export interface ListVehiclesRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: VehicleStatus;
  condition?: VehicleCondition;
  locationId?: number;
  search?: string;
}

export interface VehicleListPage {
  vehicles: VehicleListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VehicleAuditUser {
  id: number;
  firstName: string;
  lastName: string;
}

export interface VehicleDetails extends VehicleListItem {
  engineDescription: string | null;
  interiorColor: string | null;
  registrationNumber: string | null;
  firstRegistrationDate: string | null;
  acquiredAt: Date | null;
  purchasePrice: string | null;
  minimumPrice: string | null;
  description: string | null;
  createdBy: VehicleAuditUser;
  updatedBy: VehicleAuditUser | null;
}

interface VehicleListRow extends RowDataPacket {
  id: number;
  locationId: number;
  locationName: string;
  locationCode: string;
  stockNumber: string;
  vin: string | null;
  vehicleCondition: VehicleCondition;
  status: VehicleStatus;
  make: string;
  model: string;
  trimLevel: string | null;
  modelYear: number;
  bodyType: string | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  mileageKm: number;
  exteriorColor: string | null;
  askingPrice: string | null;
  primaryImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface VehicleDetailsRow extends VehicleListRow {
  engineDescription: string | null;
  interiorColor: string | null;
  registrationNumber: string | null;
  firstRegistrationDate: string | null;
  acquiredAt: Date | null;
  purchasePrice: string | null;
  minimumPrice: string | null;
  description: string | null;
  createdByUserId: number;
  createdByFirstName: string;
  createdByLastName: string;
  updatedByUserId: number | null;
  updatedByFirstName: string | null;
  updatedByLastName: string | null;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface VehicleStatusRow extends RowDataPacket {
  status: VehicleStatus;
}

interface RestorableVehicleRow extends RowDataPacket {
  status: VehicleStatus;
  locationId: number | null;
  locationStatus: "ACTIVE" | "INACTIVE" | null;
  locationDeletedAt: Date | null;
}

interface VehicleReservationRow extends RowDataPacket {
  id: number;
  reservationNumber: string;
  vehicleId: number;
  customerId: number;
  leadId: number | null;
  offerId: number | null;
  salespersonUserId: number;
  agreedPrice: string | null;
  status: VehicleReservationStatus;
  reservedAt: Date;
  expiresAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  notes: string | null;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddVehicleRequest {
  tenantId: number;
  createdByUserId: number;
  locationId: number;
  stockNumber: string;
  vin: string | null;
  condition: VehicleCondition;
  make: string;
  model: string;
  trimLevel: string | null;
  modelYear: number;
  bodyType: string | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  engineDescription: string | null;
  mileageKm: number;
  exteriorColor: string | null;
  interiorColor: string | null;
  registrationNumber: string | null;
  firstRegistrationDate: string | null;
  acquiredAt: Date | null;
  purchasePrice: string | null;
  askingPrice: string | null;
  minimumPrice: string | null;
  primaryImageUrl: string | null;
  description: string | null;
}

export type AddVehicleRepositoryResult =
  | {
      outcome: "CREATED";
      vehicle: VehicleDetails;
    }
  | {
      outcome: "LOCATION_NOT_FOUND";
    }
  | {
      outcome: "STOCK_NUMBER_CONFLICT";
    }
  | {
      outcome: "VIN_CONFLICT";
    };

const VEHICLE_DETAILS_QUERY = `
  SELECT
    v.id,
    v.location_id AS locationId,
    l.name AS locationName,
    l.code AS locationCode,
    v.stock_number AS stockNumber,
    v.vin,
    v.vehicle_condition AS vehicleCondition,
    v.status,
    v.make,
    v.model,
    v.trim_level AS trimLevel,
    v.model_year AS modelYear,
    v.body_type AS bodyType,
    v.fuel_type AS fuelType,
    v.transmission,
    v.drivetrain,
    v.engine_description AS engineDescription,
    v.mileage_km AS mileageKm,
    v.exterior_color AS exteriorColor,
    v.interior_color AS interiorColor,
    v.registration_number AS registrationNumber,
    DATE_FORMAT(v.first_registration_date, '%Y-%m-%d') AS firstRegistrationDate,
    v.acquired_at AS acquiredAt,
    v.purchase_price AS purchasePrice,
    v.asking_price AS askingPrice,
    v.minimum_price AS minimumPrice,
    v.primary_image_url AS primaryImageUrl,
    v.description,
    creator.id AS createdByUserId,
    creator.first_name AS createdByFirstName,
    creator.last_name AS createdByLastName,
    updater.id AS updatedByUserId,
    updater.first_name AS updatedByFirstName,
    updater.last_name AS updatedByLastName,
    v.created_at AS createdAt,
    v.updated_at AS updatedAt
  FROM vehicles v
  INNER JOIN locations l
    ON l.id = v.location_id
    AND l.tenant_id = v.tenant_id
  INNER JOIN users creator
    ON creator.id = v.created_by_user_id
    AND creator.tenant_id = v.tenant_id
  LEFT JOIN users updater
    ON updater.id = v.updated_by_user_id
    AND updater.tenant_id = v.tenant_id
  WHERE v.id = ?
    AND v.tenant_id = ?
    AND v.deleted_at IS NULL
    AND l.deleted_at IS NULL
  LIMIT 1
`;

const VEHICLE_RESERVATION_QUERY = `
  SELECT
    id,
    reservation_number AS reservationNumber,
    vehicle_id AS vehicleId,
    customer_id AS customerId,
    lead_id AS leadId,
    offer_id AS offerId,
    salesperson_user_id AS salespersonUserId,
    agreed_price AS agreedPrice,
    status,
    reserved_at AS reservedAt,
    expires_at AS expiresAt,
    cancelled_at AS cancelledAt,
    cancellation_reason AS cancellationReason,
    notes,
    created_by_user_id AS createdByUserId,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM vehicle_reservations
  WHERE id = ?
    AND tenant_id = ?
  LIMIT 1
`;

function mapVehicleDetailsRow(row: VehicleDetailsRow): VehicleDetails {
  return {
    id: row.id,
    location: {
      id: row.locationId,
      name: row.locationName,
      code: row.locationCode,
    },
    stockNumber: row.stockNumber,
    vin: row.vin,
    condition: row.vehicleCondition,
    status: row.status,
    make: row.make,
    model: row.model,
    trimLevel: row.trimLevel,
    modelYear: row.modelYear,
    bodyType: row.bodyType,
    fuelType: row.fuelType,
    transmission: row.transmission,
    drivetrain: row.drivetrain,
    engineDescription: row.engineDescription,
    mileageKm: row.mileageKm,
    exteriorColor: row.exteriorColor,
    interiorColor: row.interiorColor,
    registrationNumber: row.registrationNumber,
    firstRegistrationDate: row.firstRegistrationDate,
    acquiredAt: row.acquiredAt,
    purchasePrice: row.purchasePrice,
    askingPrice: row.askingPrice,
    minimumPrice: row.minimumPrice,
    primaryImageUrl: row.primaryImageUrl,
    description: row.description,
    createdBy: {
      id: row.createdByUserId,
      firstName: row.createdByFirstName,
      lastName: row.createdByLastName,
    },
    updatedBy:
      row.updatedByUserId === null
        ? null
        : {
            id: row.updatedByUserId,
            firstName: row.updatedByFirstName ?? "",
            lastName: row.updatedByLastName ?? "",
          },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapVehicleReservationRow(
  row: VehicleReservationRow,
): VehicleReservation {
  return {
    id: row.id,
    reservationNumber: row.reservationNumber,
    vehicleId: row.vehicleId,
    customerId: row.customerId,
    leadId: row.leadId,
    offerId: row.offerId,
    salespersonUserId: row.salespersonUserId,
    agreedPrice: row.agreedPrice,
    status: row.status,
    reservedAt: row.reservedAt,
    expiresAt: row.expiresAt,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    notes: row.notes,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getVehicleConflict(
  error: unknown,
): "STOCK_NUMBER_CONFLICT" | "VIN_CONFLICT" | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "ER_DUP_ENTRY"
  ) {
    return null;
  }

  const message =
    "sqlMessage" in error && typeof error.sqlMessage === "string"
      ? error.sqlMessage
      : "message" in error && typeof error.message === "string"
        ? error.message
        : "";

  if (message.includes("uq_vehicles_tenant_stock")) {
    return "STOCK_NUMBER_CONFLICT";
  }

  if (message.includes("uq_vehicles_tenant_vin")) {
    return "VIN_CONFLICT";
  }

  return null;
}

export async function getAllVehicles(
  input: ListVehiclesRepositoryInput,
): Promise<VehicleListPage> {
  const whereClauses = [
    "v.tenant_id = ?",
    "v.deleted_at IS NULL",
    "l.deleted_at IS NULL",
  ];
  const parameters: Array<string | number> = [input.tenantId];

  if (input.status) {
    whereClauses.push("v.status = ?");
    parameters.push(input.status);
  }

  if (input.condition) {
    whereClauses.push("v.vehicle_condition = ?");
    parameters.push(input.condition);
  }

  if (input.locationId) {
    whereClauses.push("v.location_id = ?");
    parameters.push(input.locationId);
  }

  if (input.search) {
    whereClauses.push(`
      CONCAT_WS(
        ' ',
        v.stock_number,
        COALESCE(v.vin, ''),
        v.make,
        v.model,
        COALESCE(v.trim_level, ''),
        l.name,
        l.code
      ) LIKE ?
    `);
    parameters.push(`%${input.search}%`);
  }

  const fromAndWhere = `
    FROM vehicles v
    INNER JOIN locations l
      ON l.id = v.location_id
      AND l.tenant_id = v.tenant_id
    WHERE ${whereClauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;

  const [[vehicleRows], [countRows]] = await Promise.all([
    database.execute<VehicleListRow[]>(
      `
        SELECT
          v.id,
          v.location_id AS locationId,
          l.name AS locationName,
          l.code AS locationCode,
          v.stock_number AS stockNumber,
          v.vin,
          v.vehicle_condition AS vehicleCondition,
          v.status,
          v.make,
          v.model,
          v.trim_level AS trimLevel,
          v.model_year AS modelYear,
          v.body_type AS bodyType,
          v.fuel_type AS fuelType,
          v.transmission,
          v.drivetrain,
          v.mileage_km AS mileageKm,
          v.exterior_color AS exteriorColor,
          v.asking_price AS askingPrice,
          v.primary_image_url AS primaryImageUrl,
          v.created_at AS createdAt,
          v.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY v.created_at DESC, v.id DESC
        LIMIT ${input.limit} OFFSET ${offset}
      `,
      parameters,
    ),
    database.execute<CountRow[]>(
      `
        SELECT COUNT(*) AS total
        ${fromAndWhere}
      `,
      parameters,
    ),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return {
    vehicles: vehicleRows.map((row) => ({
      id: row.id,
      location: {
        id: row.locationId,
        name: row.locationName,
        code: row.locationCode,
      },
      stockNumber: row.stockNumber,
      vin: row.vin,
      condition: row.vehicleCondition,
      status: row.status,
      make: row.make,
      model: row.model,
      trimLevel: row.trimLevel,
      modelYear: row.modelYear,
      bodyType: row.bodyType,
      fuelType: row.fuelType,
      transmission: row.transmission,
      drivetrain: row.drivetrain,
      mileageKm: row.mileageKm,
      exteriorColor: row.exteriorColor,
      askingPrice: row.askingPrice,
      primaryImageUrl: row.primaryImageUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function getVehicleById(
  tenantId: number,
  vehicleId: number,
): Promise<VehicleDetails | null> {
  const [rows] = await database.execute<VehicleDetailsRow[]>(
    VEHICLE_DETAILS_QUERY,
    [vehicleId, tenantId],
  );

  const row = rows[0];

  return row ? mapVehicleDetailsRow(row) : null;
}

export async function createVehicle(
  input: AddVehicleRequest,
): Promise<AddVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

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
      await connection.rollback();

      return { outcome: "LOCATION_NOT_FOUND" };
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO vehicles (
          tenant_id,
          location_id,
          stock_number,
          vin,
          vehicle_condition,
          status,
          make,
          model,
          trim_level,
          model_year,
          body_type,
          fuel_type,
          transmission,
          drivetrain,
          engine_description,
          mileage_km,
          exterior_color,
          interior_color,
          registration_number,
          first_registration_date,
          acquired_at,
          purchase_price,
          asking_price,
          minimum_price,
          primary_image_url,
          description,
          created_by_user_id
        )
        VALUES (
          ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        input.tenantId,
        input.locationId,
        input.stockNumber,
        input.vin,
        input.condition,
        input.make,
        input.model,
        input.trimLevel,
        input.modelYear,
        input.bodyType,
        input.fuelType,
        input.transmission,
        input.drivetrain,
        input.engineDescription,
        input.mileageKm,
        input.exteriorColor,
        input.interiorColor,
        input.registrationNumber,
        input.firstRegistrationDate,
        input.acquiredAt,
        input.purchasePrice,
        input.askingPrice,
        input.minimumPrice,
        input.primaryImageUrl,
        input.description,
        input.createdByUserId,
      ],
    );

    const [vehicleRows] = await connection.execute<VehicleDetailsRow[]>(
      VEHICLE_DETAILS_QUERY,
      [insertResult.insertId, input.tenantId],
    );
    const vehicle = vehicleRows[0];

    if (!vehicle) {
      throw new Error("Created vehicle could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      vehicle: mapVehicleDetailsRow(vehicle),
    };
  } catch (error) {
    await connection.rollback();

    const conflict = getVehicleConflict(error);

    if (conflict) {
      return { outcome: conflict };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function editVehicle(
  input: UpdateVehicleRepositoryInput,
): Promise<UpdateVehicleRepositoryResult> {
  const setClauses: string[] = [];
  const values: Array<string | number | Date | null> = [];

  function addChange(
    column: string,
    value: string | number | Date | null | undefined,
  ): void {
    if (value !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(value);
    }
  }

  addChange("location_id", input.changes.locationId);
  addChange("stock_number", input.changes.stockNumber);
  addChange("vin", input.changes.vin);
  addChange("vehicle_condition", input.changes.condition);
  addChange("make", input.changes.make);
  addChange("model", input.changes.model);
  addChange("trim_level", input.changes.trimLevel);
  addChange("model_year", input.changes.modelYear);
  addChange("body_type", input.changes.bodyType);
  addChange("fuel_type", input.changes.fuelType);
  addChange("transmission", input.changes.transmission);
  addChange("drivetrain", input.changes.drivetrain);
  addChange("engine_description", input.changes.engineDescription);
  addChange("mileage_km", input.changes.mileageKm);
  addChange("exterior_color", input.changes.exteriorColor);
  addChange("interior_color", input.changes.interiorColor);
  addChange("registration_number", input.changes.registrationNumber);
  addChange(
    "first_registration_date",
    input.changes.firstRegistrationDate,
  );
  addChange("acquired_at", input.changes.acquiredAt);
  addChange("purchase_price", input.changes.purchasePrice);
  addChange("asking_price", input.changes.askingPrice);
  addChange("minimum_price", input.changes.minimumPrice);
  addChange("primary_image_url", input.changes.primaryImageUrl);
  addChange("description", input.changes.description);

  if (setClauses.length === 0) {
    throw new Error("At least one vehicle change is required");
  }

  setClauses.push("updated_by_user_id = ?");
  values.push(input.updatedByUserId);

  // Ensure updatedAt changes even if the submitted values equal existing values.
  setClauses.push("updated_at = CURRENT_TIMESTAMP(3)");

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the vehicle and verify tenant ownership.
    const [vehicleRows] = await connection.execute<IdRow[]>(
      `
        SELECT v.id
        FROM vehicles v
        INNER JOIN locations l
          ON l.id = v.location_id
          AND l.tenant_id = v.tenant_id
        WHERE v.id = ?
          AND v.tenant_id = ?
          AND v.deleted_at IS NULL
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.vehicleId, input.tenantId],
    );

    if (!vehicleRows[0]) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    // A newly selected location must be active and belong to the tenant.
    if (input.changes.locationId !== undefined) {
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
        [input.changes.locationId, input.tenantId],
      );

      if (!locationRows[0]) {
        await connection.rollback();

        return { outcome: "LOCATION_NOT_FOUND" };
      }
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE vehicles
        SET ${setClauses.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [...values, input.vehicleId, input.tenantId],
    );

    const [updatedRows] = await connection.execute<VehicleDetailsRow[]>(
      VEHICLE_DETAILS_QUERY,
      [input.vehicleId, input.tenantId],
    );

    const updatedVehicle = updatedRows[0];

    if (!updatedVehicle) {
      throw new Error("Updated vehicle could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      vehicle: mapVehicleDetailsRow(updatedVehicle),
    };
  } catch (error) {
    await connection.rollback();

    const conflict = getVehicleConflict(error);

    if (conflict) {
      return { outcome: conflict };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateVehicleStatusRepository(
  input: UpdateVehicleStatusRepositoryInput,
): Promise<UpdateVehicleStatusRepositoryResult> {
  const allowedTransitions: Record<
    VehicleStatus,
    readonly VehicleStatus[]
  > = {
    DRAFT: ["AVAILABLE", "ARCHIVED"],
    AVAILABLE: ["DRAFT", "ARCHIVED"],
    RESERVED: [],
    SOLD: [],
    ARCHIVED: ["DRAFT"],
  };
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<VehicleStatusRow[]>(
      `
        SELECT v.status
        FROM vehicles v
        INNER JOIN locations l
          ON l.id = v.location_id
          AND l.tenant_id = v.tenant_id
        WHERE v.id = ?
          AND v.tenant_id = ?
          AND v.deleted_at IS NULL
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.vehicleId, input.tenantId],
    );
    const currentStatus = statusRows[0]?.status;

    if (!currentStatus) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (!allowedTransitions[currentStatus].includes(input.status)) {
      await connection.rollback();

      return {
        outcome: "INVALID_TRANSITION",
        currentStatus,
      };
    }

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE vehicles
        SET status = ?,
            updated_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [
        input.status,
        input.updatedByUserId,
        input.vehicleId,
        input.tenantId,
      ],
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error("Vehicle status could not be updated");
    }

    const [updatedRows] = await connection.execute<VehicleDetailsRow[]>(
      VEHICLE_DETAILS_QUERY,
      [input.vehicleId, input.tenantId],
    );
    const updatedVehicle = updatedRows[0];

    if (!updatedVehicle) {
      throw new Error("Updated vehicle could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      vehicle: mapVehicleDetailsRow(updatedVehicle),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function reserveVehicle(
  input: ReserveVehicleRepositoryInput,
): Promise<ReserveVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<VehicleStatusRow[]>(
      `
        SELECT v.status
        FROM vehicles v
        INNER JOIN locations l
          ON l.id = v.location_id
          AND l.tenant_id = v.tenant_id
        WHERE v.id = ?
          AND v.tenant_id = ?
          AND v.deleted_at IS NULL
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.vehicleId, input.tenantId],
    );
    const currentStatus = statusRows[0]?.status;

    if (!currentStatus) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (currentStatus !== "AVAILABLE") {
      await connection.rollback();

      return {
        outcome: "NOT_AVAILABLE",
        currentStatus,
      };
    }

    const [customerRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM customers
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [input.customerId, input.tenantId],
    );

    if (!customerRows[0]) {
      await connection.rollback();

      return { outcome: "CUSTOMER_NOT_FOUND" };
    }

    if (input.leadId !== null) {
      const [leadRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM leads
          WHERE id = ?
            AND tenant_id = ?
            AND customer_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.leadId, input.tenantId, input.customerId],
      );

      if (!leadRows[0]) {
        await connection.rollback();

        return { outcome: "LEAD_NOT_FOUND" };
      }
    }

    if (input.offerId !== null) {
      const offerParameters: Array<number> = [
        input.offerId,
        input.tenantId,
        input.vehicleId,
        input.customerId,
      ];
      let leadClause = "";

      if (input.leadId !== null) {
        leadClause = "AND lead_id = ?";
        offerParameters.push(input.leadId);
      }

      const [offerRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM offers
          WHERE id = ?
            AND tenant_id = ?
            AND vehicle_id = ?
            AND customer_id = ?
            ${leadClause}
          LIMIT 1
        `,
        offerParameters,
      );

      if (!offerRows[0]) {
        await connection.rollback();

        return { outcome: "OFFER_NOT_FOUND" };
      }
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO vehicle_reservations (
          tenant_id,
          reservation_number,
          vehicle_id,
          customer_id,
          lead_id,
          offer_id,
          salesperson_user_id,
          agreed_price,
          status,
          reserved_at,
          expires_at,
          notes,
          created_by_user_id
        )
        VALUES (
          ?,
          CONCAT('RES-', UPPER(REPLACE(UUID(), '-', ''))),
          ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP(3), ?, ?, ?
        )
      `,
      [
        input.tenantId,
        input.vehicleId,
        input.customerId,
        input.leadId,
        input.offerId,
        input.createdByUserId,
        input.agreedPrice,
        input.expiresAt,
        input.notes,
        input.createdByUserId,
      ],
    );

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE vehicles
        SET status = 'RESERVED',
            updated_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'AVAILABLE'
          AND deleted_at IS NULL
      `,
      [input.createdByUserId, input.vehicleId, input.tenantId],
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error("Vehicle could not be marked as reserved");
    }

    const [[reservationRows], [vehicleRows]] = await Promise.all([
      connection.execute<VehicleReservationRow[]>(
        VEHICLE_RESERVATION_QUERY,
        [insertResult.insertId, input.tenantId],
      ),
      connection.execute<VehicleDetailsRow[]>(VEHICLE_DETAILS_QUERY, [
        input.vehicleId,
        input.tenantId,
      ]),
    ]);
    const reservation = reservationRows[0];
    const vehicle = vehicleRows[0];

    if (!reservation || !vehicle) {
      throw new Error("Created vehicle reservation could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      reservation: mapVehicleReservationRow(reservation),
      vehicle: mapVehicleDetailsRow(vehicle),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelVehicleReservation(
  input: CancelVehicleReservationRepositoryInput,
): Promise<CancelVehicleReservationRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<VehicleStatusRow[]>(
      `
        SELECT v.status
        FROM vehicles v
        INNER JOIN locations l
          ON l.id = v.location_id
          AND l.tenant_id = v.tenant_id
        WHERE v.id = ?
          AND v.tenant_id = ?
          AND v.deleted_at IS NULL
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.vehicleId, input.tenantId],
    );
    const currentStatus = statusRows[0]?.status;

    if (!currentStatus) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (currentStatus !== "RESERVED") {
      await connection.rollback();

      return {
        outcome: "NOT_RESERVED",
        currentStatus,
      };
    }

    const [reservationIdRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM vehicle_reservations
        WHERE tenant_id = ?
          AND vehicle_id = ?
          AND status = 'ACTIVE'
        ORDER BY reserved_at DESC, id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [input.tenantId, input.vehicleId],
    );
    const reservationId = reservationIdRows[0]?.id;

    if (!reservationId) {
      await connection.rollback();

      return { outcome: "ACTIVE_RESERVATION_NOT_FOUND" };
    }

    const [reservationUpdateResult] =
      await connection.execute<ResultSetHeader>(
        `
          UPDATE vehicle_reservations
          SET status = 'CANCELLED',
              cancelled_at = CURRENT_TIMESTAMP(3),
              cancellation_reason = ?,
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
        `,
        [input.cancellationReason, reservationId, input.tenantId],
      );

    if (reservationUpdateResult.affectedRows !== 1) {
      throw new Error("Vehicle reservation could not be cancelled");
    }

    const [vehicleUpdateResult] =
      await connection.execute<ResultSetHeader>(
        `
          UPDATE vehicles
          SET status = 'AVAILABLE',
              updated_by_user_id = ?,
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'RESERVED'
            AND deleted_at IS NULL
        `,
        [input.cancelledByUserId, input.vehicleId, input.tenantId],
      );

    if (vehicleUpdateResult.affectedRows !== 1) {
      throw new Error("Reserved vehicle could not be made available");
    }

    const [reservationRows] =
      await connection.execute<VehicleReservationRow[]>(
        VEHICLE_RESERVATION_QUERY,
        [reservationId, input.tenantId],
      );
    const [vehicleRows] = await connection.execute<VehicleDetailsRow[]>(
      VEHICLE_DETAILS_QUERY,
      [input.vehicleId, input.tenantId],
    );
    const reservation = reservationRows[0];
    const vehicle = vehicleRows[0];

    if (!reservation || !vehicle) {
      throw new Error("Cancelled vehicle reservation could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CANCELLED",
      reservation: mapVehicleReservationRow(reservation),
      vehicle: mapVehicleDetailsRow(vehicle),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteVehicleRepository(
  input: DeleteVehicleRepositoryInput,
): Promise<DeleteVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<VehicleStatusRow[]>(
      `
        SELECT v.status
        FROM vehicles v
        INNER JOIN locations l
          ON l.id = v.location_id
          AND l.tenant_id = v.tenant_id
        WHERE v.id = ?
          AND v.tenant_id = ?
          AND v.deleted_at IS NULL
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.vehicleId, input.tenantId],
    );
    const currentStatus = statusRows[0]?.status;

    if (!currentStatus) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (currentStatus !== "DRAFT" && currentStatus !== "ARCHIVED") {
      await connection.rollback();

      return {
        outcome: "INVALID_STATUS",
        currentStatus,
      };
    }

    const [deleteResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE vehicles
        SET status = 'ARCHIVED',
            deleted_at = CURRENT_TIMESTAMP(3),
            updated_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND status IN ('DRAFT', 'ARCHIVED')
          AND deleted_at IS NULL
      `,
      [input.deletedByUserId, input.vehicleId, input.tenantId],
    );

    if (deleteResult.affectedRows !== 1) {
      throw new Error("Vehicle could not be soft-deleted");
    }

    await connection.commit();

    return { outcome: "DELETED" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function restoreVehicleRepository(
  input: RestoreVehicleRepositoryInput,
): Promise<RestoreVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [vehicleRows] =
      await connection.execute<RestorableVehicleRow[]>(
        `
          SELECT
            v.status,
            l.id AS locationId,
            l.status AS locationStatus,
            l.deleted_at AS locationDeletedAt
          FROM vehicles v
          LEFT JOIN locations l
            ON l.id = v.location_id
            AND l.tenant_id = v.tenant_id
          WHERE v.id = ?
            AND v.tenant_id = ?
            AND v.deleted_at IS NOT NULL
          LIMIT 1
          FOR UPDATE
        `,
        [input.vehicleId, input.tenantId],
      );
    const vehicle = vehicleRows[0];

    if (!vehicle) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (vehicle.status !== "ARCHIVED") {
      await connection.rollback();

      return {
        outcome: "INVALID_STATUS",
        currentStatus: vehicle.status,
      };
    }

    if (
      vehicle.locationId === null ||
      vehicle.locationStatus !== "ACTIVE" ||
      vehicle.locationDeletedAt !== null
    ) {
      await connection.rollback();

      return { outcome: "LOCATION_UNAVAILABLE" };
    }

    const [restoreResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE vehicles
        SET status = 'DRAFT',
            deleted_at = NULL,
            updated_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'ARCHIVED'
          AND deleted_at IS NOT NULL
      `,
      [input.restoredByUserId, input.vehicleId, input.tenantId],
    );

    if (restoreResult.affectedRows !== 1) {
      throw new Error("Vehicle could not be restored");
    }

    const [restoredRows] = await connection.execute<VehicleDetailsRow[]>(
      VEHICLE_DETAILS_QUERY,
      [input.vehicleId, input.tenantId],
    );
    const restoredVehicle = restoredRows[0];

    if (!restoredVehicle) {
      throw new Error("Restored vehicle could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "RESTORED",
      vehicle: mapVehicleDetailsRow(restoredVehicle),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
