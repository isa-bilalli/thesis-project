import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../config/database.js";
import type {
  VehicleCondition,
  VehicleStatus,
} from "../inventory/inventory.repository.js";

export interface LeadVehicleInterest {
  vehicle: {
    id: number;
    stockNumber: string;
    condition: VehicleCondition;
    status: VehicleStatus;
    make: string;
    model: string;
    modelYear: number;
    askingPrice: string | null;
    primaryImageUrl: string | null;
  };
  isPrimary: boolean;
  interestNotes: string | null;
  createdAt: Date;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface VehicleStatusRow extends RowDataPacket {
  status: VehicleStatus;
}

interface PrimaryInterestRow extends RowDataPacket {
  isPrimary: number | boolean;
}

interface LeadVehicleInterestRow extends RowDataPacket {
  vehicleId: number;
  stockNumber: string;
  vehicleCondition: VehicleCondition;
  vehicleStatus: VehicleStatus;
  make: string;
  model: string;
  modelYear: number;
  askingPrice: string | null;
  primaryImageUrl: string | null;
  isPrimary: number | boolean;
  interestNotes: string | null;
  createdAt: Date;
}

export interface AddLeadVehicleRepositoryInput {
  tenantId: number;
  leadId: number;
  vehicleId: number;
  isPrimary: boolean;
  interestNotes: string | null;
}

export interface UpdateLeadVehicleRepositoryInput {
  tenantId: number;
  leadId: number;
  vehicleId: number;
  changes: {
    isPrimary?: boolean;
    interestNotes?: string | null;
  };
}

export type ListLeadVehiclesRepositoryResult =
  | { outcome: "FOUND"; vehicles: LeadVehicleInterest[] }
  | { outcome: "LEAD_NOT_FOUND" };

export type AddLeadVehicleRepositoryResult =
  | { outcome: "CREATED"; vehicle: LeadVehicleInterest }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "VEHICLE_NOT_FOUND" }
  | { outcome: "VEHICLE_UNAVAILABLE"; status: VehicleStatus }
  | { outcome: "ALREADY_ADDED" };

export type UpdateLeadVehicleRepositoryResult =
  | { outcome: "UPDATED"; vehicle: LeadVehicleInterest }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "INTEREST_NOT_FOUND" }
  | { outcome: "CANNOT_CLEAR_ONLY_PRIMARY" };

export type DeleteLeadVehicleRepositoryResult =
  | { outcome: "DELETED" }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "INTEREST_NOT_FOUND" };

const LEAD_VEHICLE_QUERY = `
  SELECT
    vehicle_record.id AS vehicleId,
    vehicle_record.stock_number AS stockNumber,
    vehicle_record.vehicle_condition AS vehicleCondition,
    vehicle_record.status AS vehicleStatus,
    vehicle_record.make,
    vehicle_record.model,
    vehicle_record.model_year AS modelYear,
    vehicle_record.asking_price AS askingPrice,
    vehicle_record.primary_image_url AS primaryImageUrl,
    interest.is_primary AS isPrimary,
    interest.interest_notes AS interestNotes,
    interest.created_at AS createdAt
  FROM lead_vehicles interest
  INNER JOIN leads lead_record
    ON lead_record.id = interest.lead_id
    AND lead_record.tenant_id = interest.tenant_id
  INNER JOIN vehicles vehicle_record
    ON vehicle_record.id = interest.vehicle_id
    AND vehicle_record.tenant_id = interest.tenant_id
  WHERE interest.tenant_id = ?
    AND interest.lead_id = ?
    AND lead_record.deleted_at IS NULL
    AND vehicle_record.deleted_at IS NULL
`;

function mapLeadVehicleInterest(
  row: LeadVehicleInterestRow,
): LeadVehicleInterest {
  return {
    vehicle: {
      id: row.vehicleId,
      stockNumber: row.stockNumber,
      condition: row.vehicleCondition,
      status: row.vehicleStatus,
      make: row.make,
      model: row.model,
      modelYear: row.modelYear,
      askingPrice: row.askingPrice,
      primaryImageUrl: row.primaryImageUrl,
    },
    isPrimary: Boolean(row.isPrimary),
    interestNotes: row.interestNotes,
    createdAt: row.createdAt,
  };
}

function isDuplicateEntry(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

export async function listLeadVehicles(
  tenantId: number,
  leadId: number,
): Promise<ListLeadVehiclesRepositoryResult> {
  const [leadRows] = await database.execute<IdRow[]>(
    `
      SELECT id
      FROM leads
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [leadId, tenantId],
  );

  if (!leadRows[0]) {
    return { outcome: "LEAD_NOT_FOUND" };
  }

  const [rows] = await database.execute<LeadVehicleInterestRow[]>(
    `${LEAD_VEHICLE_QUERY}
     ORDER BY interest.is_primary DESC, interest.created_at ASC, vehicle_record.id ASC`,
    [tenantId, leadId],
  );

  return {
    outcome: "FOUND",
    vehicles: rows.map(mapLeadVehicleInterest),
  };
}

export async function addLeadVehicle(
  input: AddLeadVehicleRepositoryInput,
): Promise<AddLeadVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [leadRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM leads
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.leadId, input.tenantId],
    );

    if (!leadRows[0]) {
      await connection.rollback();
      return { outcome: "LEAD_NOT_FOUND" };
    }

    const [vehicleRows] = await connection.execute<VehicleStatusRow[]>(
      `
        SELECT status
        FROM vehicles
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [input.vehicleId, input.tenantId],
    );
    const vehicle = vehicleRows[0];

    if (!vehicle) {
      await connection.rollback();
      return { outcome: "VEHICLE_NOT_FOUND" };
    }

    if (vehicle.status === "SOLD" || vehicle.status === "ARCHIVED") {
      await connection.rollback();
      return { outcome: "VEHICLE_UNAVAILABLE", status: vehicle.status };
    }

    const [countRows] = await connection.execute<CountRow[]>(
      `
        SELECT COUNT(*) AS total
        FROM lead_vehicles
        WHERE tenant_id = ?
          AND lead_id = ?
      `,
      [input.tenantId, input.leadId],
    );
    const shouldBePrimary =
      input.isPrimary || Number(countRows[0]?.total ?? 0) === 0;

    if (shouldBePrimary) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE lead_vehicles
          SET is_primary = FALSE
          WHERE tenant_id = ?
            AND lead_id = ?
            AND is_primary = TRUE
        `,
        [input.tenantId, input.leadId],
      );
    }

    await connection.execute<ResultSetHeader>(
      `
        INSERT INTO lead_vehicles (
          tenant_id,
          lead_id,
          vehicle_id,
          is_primary,
          interest_notes
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        input.tenantId,
        input.leadId,
        input.vehicleId,
        shouldBePrimary,
        input.interestNotes,
      ],
    );

    const [interestRows] = await connection.execute<LeadVehicleInterestRow[]>(
      `${LEAD_VEHICLE_QUERY}
       AND interest.vehicle_id = ?
       LIMIT 1`,
      [input.tenantId, input.leadId, input.vehicleId],
    );
    const interest = interestRows[0];

    if (!interest) {
      throw new Error("Created lead vehicle interest could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      vehicle: mapLeadVehicleInterest(interest),
    };
  } catch (error) {
    await connection.rollback();

    if (isDuplicateEntry(error)) {
      return { outcome: "ALREADY_ADDED" };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLeadVehicle(
  input: UpdateLeadVehicleRepositoryInput,
): Promise<UpdateLeadVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [leadRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM leads
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.leadId, input.tenantId],
    );

    if (!leadRows[0]) {
      await connection.rollback();
      return { outcome: "LEAD_NOT_FOUND" };
    }

    const [interestRows] = await connection.execute<PrimaryInterestRow[]>(
      `
        SELECT is_primary AS isPrimary
        FROM lead_vehicles
        WHERE tenant_id = ?
          AND lead_id = ?
          AND vehicle_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.tenantId, input.leadId, input.vehicleId],
    );

    if (!interestRows[0]) {
      await connection.rollback();
      return { outcome: "INTEREST_NOT_FOUND" };
    }

    if (
      input.changes.isPrimary === false &&
      Boolean(interestRows[0].isPrimary)
    ) {
      const [replacementRows] = await connection.execute<IdRow[]>(
        `
          SELECT vehicle_id AS id
          FROM lead_vehicles
          WHERE tenant_id = ?
            AND lead_id = ?
            AND vehicle_id <> ?
          ORDER BY created_at ASC, vehicle_id ASC
          LIMIT 1
          FOR UPDATE
        `,
        [input.tenantId, input.leadId, input.vehicleId],
      );
      const replacement = replacementRows[0];

      if (!replacement) {
        await connection.rollback();
        return { outcome: "CANNOT_CLEAR_ONLY_PRIMARY" };
      }

      await connection.execute<ResultSetHeader>(
        `
          UPDATE lead_vehicles
          SET is_primary = TRUE
          WHERE tenant_id = ?
            AND lead_id = ?
            AND vehicle_id = ?
        `,
        [input.tenantId, input.leadId, replacement.id],
      );
    }

    if (input.changes.isPrimary === true) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE lead_vehicles
          SET is_primary = FALSE
          WHERE tenant_id = ?
            AND lead_id = ?
            AND is_primary = TRUE
        `,
        [input.tenantId, input.leadId],
      );
    }

    const setClauses: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    if (input.changes.isPrimary !== undefined) {
      setClauses.push("is_primary = ?");
      values.push(input.changes.isPrimary);
    }

    if (input.changes.interestNotes !== undefined) {
      setClauses.push("interest_notes = ?");
      values.push(input.changes.interestNotes);
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE lead_vehicles
        SET ${setClauses.join(", ")}
        WHERE tenant_id = ?
          AND lead_id = ?
          AND vehicle_id = ?
      `,
      [...values, input.tenantId, input.leadId, input.vehicleId],
    );

    const [updatedRows] = await connection.execute<LeadVehicleInterestRow[]>(
      `${LEAD_VEHICLE_QUERY}
       AND interest.vehicle_id = ?
       LIMIT 1`,
      [input.tenantId, input.leadId, input.vehicleId],
    );
    const updated = updatedRows[0];

    if (!updated) {
      throw new Error("Updated lead vehicle interest could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      vehicle: mapLeadVehicleInterest(updated),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteLeadVehicle(
  tenantId: number,
  leadId: number,
  vehicleId: number,
): Promise<DeleteLeadVehicleRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [leadRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM leads
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [leadId, tenantId],
    );

    if (!leadRows[0]) {
      await connection.rollback();
      return { outcome: "LEAD_NOT_FOUND" };
    }

    const [interestRows] = await connection.execute<PrimaryInterestRow[]>(
      `
        SELECT is_primary AS isPrimary
        FROM lead_vehicles
        WHERE tenant_id = ?
          AND lead_id = ?
          AND vehicle_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [tenantId, leadId, vehicleId],
    );
    const interest = interestRows[0];

    if (!interest) {
      await connection.rollback();
      return { outcome: "INTEREST_NOT_FOUND" };
    }

    await connection.execute<ResultSetHeader>(
      `
        DELETE FROM lead_vehicles
        WHERE tenant_id = ?
          AND lead_id = ?
          AND vehicle_id = ?
      `,
      [tenantId, leadId, vehicleId],
    );

    if (Boolean(interest.isPrimary)) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE lead_vehicles
          SET is_primary = TRUE
          WHERE tenant_id = ?
            AND lead_id = ?
          ORDER BY created_at ASC, vehicle_id ASC
          LIMIT 1
        `,
        [tenantId, leadId],
      );
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
