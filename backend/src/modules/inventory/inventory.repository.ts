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
