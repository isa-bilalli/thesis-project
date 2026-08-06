import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../../config/database.js";

export interface TenantListItem {
  id: number;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  currencyCode: string;
  timezone: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface TenantListRow extends RowDataPacket, TenantListItem {}

export type TenantStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "INACTIVE";

export interface UpdateTenantStatusRepositoryInput {
  tenantId: number;
  status: TenantStatus;
}

export type UpdateTenantStatusRepositoryResult =
  | {
      outcome: "UPDATED";
      tenant: TenantListItem;
    }
  | {
      outcome: "NOT_FOUND";
    };

export interface UpdateTenantChanges {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  currencyCode?: string;
  timezone?: string;
}

export interface UpdateTenantRepositoryInput {
  tenantId: number;
  changes: UpdateTenantChanges;
}

export type UpdateTenantRepositoryResult =
  | {
      outcome: "UPDATED";
      tenant: TenantListItem;
    }
  | {
      outcome: "NOT_FOUND";
    };

export interface CreateTenantRepositoryInput {
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  currencyCode: string;
  timezone: string;
  primaryLocation: {
    name: string;
    code: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postalCode: string | null;
    countryCode: string;
    phone: string | null;
    email: string | null;
  };
}

export interface CreatedPrimaryLocation {
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
  status: "ACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatedTenant extends TenantListItem {
  primaryLocation: CreatedPrimaryLocation;
}

export type CreateTenantRepositoryResult =
  | {
      outcome: "CREATED";
      tenant: CreatedTenant;
    }
  | {
      outcome: "SLUG_CONFLICT";
    };

interface CreatedLocationRow
  extends RowDataPacket,
    CreatedPrimaryLocation {}

function isDuplicateEntry(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

export async function getAllTenants(): Promise<TenantListItem[]> {
  const [rows] = await database.execute<TenantListRow[]>(
    `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.contact_email AS contactEmail,
        t.contact_phone AS contactPhone,
        t.currency_code AS currencyCode,
        t.timezone,
        t.status,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt
      FROM tenants t
      WHERE t.deleted_at IS NULL
      ORDER BY t.created_at DESC, t.id DESC
    `,
  );
  return rows;
}

export async function findTenantById(
  tenantId: number,
): Promise<TenantListItem | null> {
  const [rows] = await database.execute<TenantListRow[]>(
    `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.contact_email AS contactEmail,
        t.contact_phone AS contactPhone,
        t.currency_code AS currencyCode,
        t.timezone,
        t.status,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt
      FROM tenants t
      WHERE t.id = ?
        AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [tenantId],
  );

  return rows[0] ?? null;
}

export async function createTenantWithPrimaryLocation(
  input: CreateTenantRepositoryInput,
): Promise<CreateTenantRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [tenantInsert] =
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO tenants (
            name,
            slug,
            contact_email,
            contact_phone,
            currency_code,
            timezone,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          input.name,
          input.slug,
          input.contactEmail,
          input.contactPhone,
          input.currencyCode,
          input.timezone,
        ],
      );

    const tenantId = tenantInsert.insertId;

    const [locationInsert] =
      await connection.execute<ResultSetHeader>(
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'ACTIVE')
        `,
        [
          tenantId,
          input.primaryLocation.name,
          input.primaryLocation.code,
          input.primaryLocation.addressLine1,
          input.primaryLocation.addressLine2,
          input.primaryLocation.city,
          input.primaryLocation.postalCode,
          input.primaryLocation.countryCode,
          input.primaryLocation.phone,
          input.primaryLocation.email,
        ],
      );

    const [tenantRows] =
      await connection.execute<TenantListRow[]>(
        `
          SELECT
            t.id,
            t.name,
            t.slug,
            t.contact_email AS contactEmail,
            t.contact_phone AS contactPhone,
            t.currency_code AS currencyCode,
            t.timezone,
            t.status,
            t.created_at AS createdAt,
            t.updated_at AS updatedAt
          FROM tenants t
          WHERE t.id = ?
          LIMIT 1
        `,
        [tenantId],
      );

    const [locationRows] =
      await connection.execute<CreatedLocationRow[]>(
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
          LIMIT 1
        `,
        [locationInsert.insertId, tenantId],
      );

    const tenant = tenantRows[0];
    const primaryLocation = locationRows[0];

    if (!tenant || !primaryLocation) {
      throw new Error("Created tenant could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      tenant: {
        ...tenant,
        primaryLocation: {
          ...primaryLocation,
          isPrimary: Boolean(primaryLocation.isPrimary),
        },
      },
    };
  } catch (error) {
    await connection.rollback();

    if (isDuplicateEntry(error)) {
      return { outcome: "SLUG_CONFLICT" };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function updateTenantStatus(
  input: UpdateTenantStatusRepositoryInput,
): Promise<UpdateTenantStatusRepositoryResult> {
  await database.execute<ResultSetHeader>(
    `
      UPDATE tenants
      SET status = ?
      WHERE id = ?
        AND deleted_at IS NULL
    `,
    [input.status, input.tenantId],
  );

  const tenant = await findTenantById(input.tenantId);

  if (!tenant) {
    return { outcome: "NOT_FOUND" };
  }

  return {
    outcome: "UPDATED",
    tenant,
  };
}

export async function updateTenant(
  input: UpdateTenantRepositoryInput,
): Promise<UpdateTenantRepositoryResult> {
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
  addChange("contact_email", input.changes.contactEmail);
  addChange("contact_phone", input.changes.contactPhone);
  addChange("currency_code", input.changes.currencyCode);
  addChange("timezone", input.changes.timezone);

  if (setClauses.length === 0) {
    throw new Error("At least one tenant change is required");
  }

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute<ResultSetHeader>(
      `
        UPDATE tenants
        SET ${setClauses.join(", ")}
        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [...values, input.tenantId],
    );

    const [rows] = await connection.execute<TenantListRow[]>(
      `
        SELECT
          t.id,
          t.name,
          t.slug,
          t.contact_email AS contactEmail,
          t.contact_phone AS contactPhone,
          t.currency_code AS currencyCode,
          t.timezone,
          t.status,
          t.created_at AS createdAt,
          t.updated_at AS updatedAt
        FROM tenants t
        WHERE t.id = ?
          AND t.deleted_at IS NULL
        LIMIT 1
      `,
      [input.tenantId],
    );

    const tenant = rows[0];

    if (!tenant) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      tenant,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
