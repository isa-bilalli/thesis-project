import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../../config/database.js";

export type LocationStatus = "ACTIVE" | "INACTIVE";

export interface LocationListItem {
  id: number;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  status: LocationStatus;
  createdAt: Date;
  updatedAt: Date;
}

type LocationListRow = RowDataPacket &
  Omit<LocationListItem, "isPrimary"> & {
    isPrimary: number | boolean;
  };

export interface UpdateLocationChanges {
  name?: string;
  code?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  postalCode?: string | null;
  countryCode?: string;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateLocationRepositoryInput {
  tenantId: number;
  locationId: number;
  changes: UpdateLocationChanges;
}

export type UpdateLocationRepositoryResult =
  | {
      outcome: "UPDATED";
      location: LocationListItem;
    }
  | {
      outcome: "NOT_FOUND";
    }
  | {
      outcome: "CODE_CONFLICT";
    };

export interface UpdateLocationStatusRepositoryInput {
  tenantId: number;
  locationId: number;
  status: LocationStatus;
}

export type UpdateLocationStatusRepositoryResult =
  | {
      outcome: "UPDATED";
      location: LocationListItem;
    }
  | {
      outcome: "NOT_FOUND";
    }
  | {
      outcome: "PRIMARY_LOCATION_CONFLICT";
    };

export interface SetPrimaryLocationRepositoryInput {
  tenantId: number;
  locationId: number;
}

export type SetPrimaryLocationRepositoryResult =
  | {
      outcome: "UPDATED";
      location: LocationListItem;
    }
  | {
      outcome: "NOT_FOUND";
    }
  | {
      outcome: "INACTIVE_LOCATION";
    };

export interface CreateLocationRepositoryInput {
  tenantId: number;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
}

export type CreateLocationRepositoryResult =
  | {
      outcome: "CREATED";
      location: LocationListItem;
    }
  | {
      outcome: "CODE_CONFLICT";
    };

function mapLocationRow(row: LocationListRow): LocationListItem {
  return {
    ...row,
    isPrimary: Boolean(row.isPrimary),
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

export async function getLocations(
  tenantId: number,
): Promise<LocationListItem[]> {
  const [rows] = await database.execute<LocationListRow[]>(
    `
      SELECT
        l.id,
        l.name,
        l.code,
        l.address_line_1 AS addressLine1,
        l.address_line_2 AS addressLine2,
        l.city,
        l.postal_code AS postalCode,
        l.country_code AS countryCode,
        l.phone,
        l.email,
        l.is_primary AS isPrimary,
        l.status,
        l.created_at AS createdAt,
        l.updated_at AS updatedAt
      FROM locations l
      WHERE l.tenant_id = ?
        AND l.deleted_at IS NULL
      ORDER BY l.is_primary DESC, l.name ASC, l.id ASC
    `,
    [tenantId],
  );

  return rows.map(mapLocationRow);
}

export async function createLocation(
  input: CreateLocationRepositoryInput,
): Promise<CreateLocationRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO locations (
          tenant_id,
          name,
          code,
          address_line_1,
          address_line_2,
          city,
          postal_code,
          country_code,
          phone,
          email,
          is_primary,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'ACTIVE')
      `,
      [
        input.tenantId,
        input.name,
        input.code,
        input.addressLine1,
        input.addressLine2,
        input.city,
        input.postalCode,
        input.countryCode,
        input.phone,
        input.email,
      ],
    );

    const [rows] = await connection.execute<LocationListRow[]>(
      `
        SELECT
          l.id,
          l.name,
          l.code,
          l.address_line_1 AS addressLine1,
          l.address_line_2 AS addressLine2,
          l.city,
          l.postal_code AS postalCode,
          l.country_code AS countryCode,
          l.phone,
          l.email,
          l.is_primary AS isPrimary,
          l.status,
          l.created_at AS createdAt,
          l.updated_at AS updatedAt
        FROM locations l
        WHERE l.id = ?
          AND l.tenant_id = ?
          AND l.deleted_at IS NULL
        LIMIT 1
      `,
      [insertResult.insertId, input.tenantId],
    );

    const location = rows[0];

    if (!location) {
      throw new Error("Created location could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      location: mapLocationRow(location),
    };
  } catch (error) {
    await connection.rollback();

    if (isDuplicateEntry(error)) {
      return { outcome: "CODE_CONFLICT" };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLocation(
  input: UpdateLocationRepositoryInput,
): Promise<UpdateLocationRepositoryResult> {
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  function addChange(
    column: string,
    value: string | null | undefined,
  ): void {
    if (value !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(value);
    }
  }

  addChange("name", input.changes.name);
  addChange("code", input.changes.code);
  addChange("address_line_1", input.changes.addressLine1);
  addChange("address_line_2", input.changes.addressLine2);
  addChange("city", input.changes.city);
  addChange("postal_code", input.changes.postalCode);
  addChange("country_code", input.changes.countryCode);
  addChange("phone", input.changes.phone);
  addChange("email", input.changes.email);

  if (setClauses.length === 0) {
    throw new Error("At least one location change is required");
  }

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute<ResultSetHeader>(
      `
        UPDATE locations
        SET ${setClauses.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [...values, input.locationId, input.tenantId],
    );
    const [rows] = await connection.execute<LocationListRow[]>(
      `
        SELECT
          l.id,
          l.name,
          l.code,
          l.address_line_1 AS addressLine1,
          l.address_line_2 AS addressLine2,
          l.city,
          l.postal_code AS postalCode,
          l.country_code AS countryCode,
          l.phone,
          l.email,
          l.is_primary AS isPrimary,
          l.status,
          l.created_at AS createdAt,
          l.updated_at AS updatedAt
        FROM locations l
        WHERE l.id = ?
          AND l.tenant_id = ?
          AND l.deleted_at IS NULL
        LIMIT 1
      `,
      [input.locationId, input.tenantId],
    );

    const location = rows[0];

    if (!location) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      location: mapLocationRow(location),
    };
  } catch (error) {
    await connection.rollback();

    if (isDuplicateEntry(error)) {
      return { outcome: "CODE_CONFLICT" };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLocationStatus(
  input: UpdateLocationStatusRepositoryInput,
): Promise<UpdateLocationStatusRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [currentRows] = await connection.execute<LocationListRow[]>(
      `
        SELECT
          l.id,
          l.name,
          l.code,
          l.address_line_1 AS addressLine1,
          l.address_line_2 AS addressLine2,
          l.city,
          l.postal_code AS postalCode,
          l.country_code AS countryCode,
          l.phone,
          l.email,
          l.is_primary AS isPrimary,
          l.status,
          l.created_at AS createdAt,
          l.updated_at AS updatedAt
        FROM locations l
        WHERE l.id = ?
          AND l.tenant_id = ?
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.locationId, input.tenantId],
    );

    const currentLocation = currentRows[0];

    if (!currentLocation) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (Boolean(currentLocation.isPrimary) && input.status === "INACTIVE") {
      await connection.rollback();
      return { outcome: "PRIMARY_LOCATION_CONFLICT" };
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE locations
        SET status = ?
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [input.status, input.locationId, input.tenantId],
    );

    const [updatedRows] = await connection.execute<LocationListRow[]>(
      `
        SELECT
          l.id,
          l.name,
          l.code,
          l.address_line_1 AS addressLine1,
          l.address_line_2 AS addressLine2,
          l.city,
          l.postal_code AS postalCode,
          l.country_code AS countryCode,
          l.phone,
          l.email,
          l.is_primary AS isPrimary,
          l.status,
          l.created_at AS createdAt,
          l.updated_at AS updatedAt
        FROM locations l
        WHERE l.id = ?
          AND l.tenant_id = ?
          AND l.deleted_at IS NULL
        LIMIT 1
      `,
      [input.locationId, input.tenantId],
    );

    const updatedLocation = updatedRows[0];

    if (!updatedLocation) {
      throw new Error("Updated location could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      location: mapLocationRow(updatedLocation),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setPrimaryLocation(
  input: SetPrimaryLocationRepositoryInput,
): Promise<SetPrimaryLocationRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [tenantRows] = await connection.execute<RowDataPacket[]>(
      `
        SELECT t.id
        FROM tenants t
        WHERE t.id = ?
          AND t.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.tenantId],
    );

    if (!tenantRows[0]) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    const [targetRows] = await connection.execute<LocationListRow[]>(
      `
        SELECT
          l.id,
          l.name,
          l.code,
          l.address_line_1 AS addressLine1,
          l.address_line_2 AS addressLine2,
          l.city,
          l.postal_code AS postalCode,
          l.country_code AS countryCode,
          l.phone,
          l.email,
          l.is_primary AS isPrimary,
          l.status,
          l.created_at AS createdAt,
          l.updated_at AS updatedAt
        FROM locations l
        WHERE l.id = ?
          AND l.tenant_id = ?
          AND l.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.locationId, input.tenantId],
    );

    const targetLocation = targetRows[0];

    if (!targetLocation) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (targetLocation.status !== "ACTIVE") {
      await connection.rollback();
      return { outcome: "INACTIVE_LOCATION" };
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE locations
        SET is_primary = CASE WHEN id = ? THEN TRUE ELSE FALSE END
        WHERE tenant_id = ?
          AND deleted_at IS NULL
      `,
      [input.locationId, input.tenantId],
    );

    const [updatedRows] = await connection.execute<LocationListRow[]>(
      `
        SELECT
          l.id,
          l.name,
          l.code,
          l.address_line_1 AS addressLine1,
          l.address_line_2 AS addressLine2,
          l.city,
          l.postal_code AS postalCode,
          l.country_code AS countryCode,
          l.phone,
          l.email,
          l.is_primary AS isPrimary,
          l.status,
          l.created_at AS createdAt,
          l.updated_at AS updatedAt
        FROM locations l
        WHERE l.id = ?
          AND l.tenant_id = ?
          AND l.deleted_at IS NULL
        LIMIT 1
      `,
      [input.locationId, input.tenantId],
    );

    const updatedLocation = updatedRows[0];

    if (!updatedLocation) {
      throw new Error("Primary location could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      location: mapLocationRow(updatedLocation),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
