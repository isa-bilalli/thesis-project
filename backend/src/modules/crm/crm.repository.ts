import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../config/database.js";

export type CustomerType = "INDIVIDUAL" | "BUSINESS";

export type CustomerStatus = "PROSPECT" | "CUSTOMER" | "INACTIVE";

export interface CustomerListItem {
  id: number;
  customerType: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  city: string | null;
  countryCode: string | null;
  status: CustomerStatus;
  assignedTo: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListCustomersRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: CustomerStatus;
  customerType?: CustomerType;
  assignedToUserId?: number;
  search?: string;
}

export interface CustomerListPage {
  customers: CustomerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerAuditUser {
  id: number;
  firstName: string;
  lastName: string;
}

export interface CustomerDetails extends CustomerListItem {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  notes: string | null;
  createdBy: CustomerAuditUser;
}

export interface CreateCustomerRepositoryInput {
  tenantId: number;
  createdByUserId: number;
  customerType: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  assignedToUserId: number | null;
  notes: string | null;
}

export type CreateCustomerRepositoryResult =
  | { outcome: "CREATED"; customer: CustomerDetails }
  | { outcome: "ASSIGNEE_NOT_FOUND" };

export interface UpdateCustomerChanges {
  customerType?: CustomerType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string;
  secondaryPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  assignedToUserId?: number | null;
  notes?: string | null;
}

export interface UpdateCustomerRepositoryInput {
  tenantId: number;
  customerId: number;
  changes: UpdateCustomerChanges;
}

export type UpdateCustomerRepositoryResult =
  | { outcome: "UPDATED"; customer: CustomerDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "ASSIGNEE_NOT_FOUND" };

export interface UpdateCustomerStatusRepositoryInput {
  tenantId: number;
  customerId: number;
  status: CustomerStatus;
}

export type UpdateCustomerStatusRepositoryResult =
  | { outcome: "UPDATED"; customer: CustomerDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: CustomerStatus };

export interface DeleteCustomerRepositoryInput {
  tenantId: number;
  customerId: number;
}

export type DeleteCustomerRepositoryResult =
  | { outcome: "DELETED" }
  | { outcome: "NOT_FOUND" };

export interface RestoreCustomerRepositoryInput {
  tenantId: number;
  customerId: number;
}

export type RestoreCustomerRepositoryResult =
  | { outcome: "RESTORED"; customer: CustomerDetails }
  | { outcome: "NOT_FOUND" };

export type LeadSource =
  | "WALK_IN"
  | "WEBSITE"
  | "PHONE"
  | "EMAIL"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "OTHER";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "WON"
  | "LOST";

export type LeadPriority = "LOW" | "NORMAL" | "HIGH";

export interface LeadListItem {
  id: number;
  location: {
    id: number;
    name: string;
    code: string;
  };
  customer: {
    id: number;
    customerType: CustomerType;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string;
  };
  assignedTo: CustomerAuditUser | null;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  budgetMin: string | null;
  budgetMax: string | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadDetails extends LeadListItem {
  lastContactAt: Date | null;
  convertedAt: Date | null;
  lostReason: string | null;
  notes: string | null;
  createdBy: CustomerAuditUser;
}

export interface ListLeadsRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  locationId?: number;
  customerId?: number;
  assignedToUserId?: number;
  search?: string;
}

export interface LeadListPage {
  leads: LeadListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateLeadRepositoryInput {
  tenantId: number;
  createdByUserId: number;
  locationId: number;
  customerId: number;
  assignedToUserId: number | null;
  source: LeadSource;
  priority: LeadPriority;
  budgetMin: string | null;
  budgetMax: string | null;
  lastContactAt: Date | null;
  nextFollowUpAt: Date | null;
  notes: string | null;
}

export type CreateLeadRepositoryResult =
  | { outcome: "CREATED"; lead: LeadDetails }
  | { outcome: "LOCATION_NOT_FOUND" }
  | { outcome: "CUSTOMER_NOT_FOUND" }
  | { outcome: "ASSIGNEE_NOT_FOUND" };

export interface UpdateLeadChanges {
  locationId?: number;
  customerId?: number;
  assignedToUserId?: number | null;
  source?: LeadSource;
  priority?: LeadPriority;
  budgetMin?: string | null;
  budgetMax?: string | null;
  lastContactAt?: Date | null;
  nextFollowUpAt?: Date | null;
  notes?: string | null;
}

export interface UpdateLeadRepositoryInput {
  tenantId: number;
  leadId: number;
  changes: UpdateLeadChanges;
}

export type UpdateLeadRepositoryResult =
  | { outcome: "UPDATED"; lead: LeadDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "LOCATION_NOT_FOUND" }
  | { outcome: "CUSTOMER_NOT_FOUND" }
  | { outcome: "ASSIGNEE_NOT_FOUND" };

export interface UpdateLeadStatusRepositoryInput {
  tenantId: number;
  leadId: number;
  actorUserId: number;
  status: LeadStatus;
  lostReason: string | null;
}

export type UpdateLeadStatusRepositoryResult =
  | { outcome: "UPDATED"; lead: LeadDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: LeadStatus };

export interface DeleteLeadRepositoryInput {
  tenantId: number;
  leadId: number;
}

export type DeleteLeadRepositoryResult =
  | { outcome: "DELETED" }
  | { outcome: "NOT_FOUND" };

export interface RestoreLeadRepositoryInput {
  tenantId: number;
  leadId: number;
}

export type RestoreLeadRepositoryResult =
  | { outcome: "RESTORED"; lead: LeadDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "LOCATION_UNAVAILABLE" }
  | { outcome: "CUSTOMER_UNAVAILABLE" };

interface CustomerListRow extends RowDataPacket {
  id: number;
  customerType: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string;
  secondaryPhone: string | null;
  city: string | null;
  countryCode: string | null;
  status: CustomerStatus;
  assignedToUserId: number | null;
  assignedToFirstName: string | null;
  assignedToLastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerDetailsRow extends CustomerListRow {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByFirstName: string;
  createdByLastName: string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface CustomerStatusRow extends RowDataPacket {
  status: CustomerStatus;
}

interface LeadListRow extends RowDataPacket {
  id: number;
  locationId: number;
  locationName: string;
  locationCode: string;
  customerId: number;
  customerType: CustomerType;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCompanyName: string | null;
  customerPhone: string;
  assignedToUserId: number | null;
  assignedToFirstName: string | null;
  assignedToLastName: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  budgetMin: string | null;
  budgetMax: string | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadDetailsRow extends LeadListRow {
  lastContactAt: Date | null;
  convertedAt: Date | null;
  lostReason: string | null;
  notes: string | null;
  createdByUserId: number;
  createdByFirstName: string;
  createdByLastName: string;
}

interface LeadStatusRow extends RowDataPacket {
  status: LeadStatus;
}

interface RestorableLeadRow extends RowDataPacket {
  locationAvailable: number | boolean;
  customerAvailable: number | boolean;
}

const CUSTOMER_DETAILS_QUERY = `
  SELECT
    c.id,
    c.customer_type AS customerType,
    c.first_name AS firstName,
    c.last_name AS lastName,
    c.company_name AS companyName,
    c.email,
    c.phone,
    c.secondary_phone AS secondaryPhone,
    c.address_line_1 AS addressLine1,
    c.address_line_2 AS addressLine2,
    c.city,
    c.postal_code AS postalCode,
    c.country_code AS countryCode,
    c.status,
    c.notes,
    assigned.id AS assignedToUserId,
    assigned.first_name AS assignedToFirstName,
    assigned.last_name AS assignedToLastName,
    creator.id AS createdByUserId,
    creator.first_name AS createdByFirstName,
    creator.last_name AS createdByLastName,
    c.created_at AS createdAt,
    c.updated_at AS updatedAt
  FROM customers c
  INNER JOIN users creator
    ON creator.id = c.created_by_user_id
    AND creator.tenant_id = c.tenant_id
  LEFT JOIN users assigned
    ON assigned.id = c.assigned_to_user_id
    AND assigned.tenant_id = c.tenant_id
    AND assigned.deleted_at IS NULL
  WHERE c.id = ?
    AND c.tenant_id = ?
    AND c.deleted_at IS NULL
  LIMIT 1
`;

function mapCustomerDetailsRow(row: CustomerDetailsRow): CustomerDetails {
  return {
    id: row.id,
    customerType: row.customerType,
    firstName: row.firstName,
    lastName: row.lastName,
    companyName: row.companyName,
    email: row.email,
    phone: row.phone,
    secondaryPhone: row.secondaryPhone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    postalCode: row.postalCode,
    countryCode: row.countryCode,
    status: row.status,
    assignedTo:
      row.assignedToUserId === null
        ? null
        : {
            id: row.assignedToUserId,
            firstName: row.assignedToFirstName ?? "",
            lastName: row.assignedToLastName ?? "",
          },
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

const LEAD_DETAILS_QUERY = `
  SELECT
    lead_record.id,
    location_record.id AS locationId,
    location_record.name AS locationName,
    location_record.code AS locationCode,
    customer_record.id AS customerId,
    customer_record.customer_type AS customerType,
    customer_record.first_name AS customerFirstName,
    customer_record.last_name AS customerLastName,
    customer_record.company_name AS customerCompanyName,
    customer_record.phone AS customerPhone,
    assigned.id AS assignedToUserId,
    assigned.first_name AS assignedToFirstName,
    assigned.last_name AS assignedToLastName,
    lead_record.source,
    lead_record.status,
    lead_record.priority,
    lead_record.budget_min AS budgetMin,
    lead_record.budget_max AS budgetMax,
    lead_record.last_contact_at AS lastContactAt,
    lead_record.next_follow_up_at AS nextFollowUpAt,
    lead_record.converted_at AS convertedAt,
    lead_record.lost_reason AS lostReason,
    lead_record.notes,
    creator.id AS createdByUserId,
    creator.first_name AS createdByFirstName,
    creator.last_name AS createdByLastName,
    lead_record.created_at AS createdAt,
    lead_record.updated_at AS updatedAt
  FROM leads lead_record
  INNER JOIN locations location_record
    ON location_record.id = lead_record.location_id
    AND location_record.tenant_id = lead_record.tenant_id
  INNER JOIN customers customer_record
    ON customer_record.id = lead_record.customer_id
    AND customer_record.tenant_id = lead_record.tenant_id
  INNER JOIN users creator
    ON creator.id = lead_record.created_by_user_id
    AND creator.tenant_id = lead_record.tenant_id
  LEFT JOIN users assigned
    ON assigned.id = lead_record.assigned_to_user_id
    AND assigned.tenant_id = lead_record.tenant_id
    AND assigned.deleted_at IS NULL
  WHERE lead_record.id = ?
    AND lead_record.tenant_id = ?
    AND lead_record.deleted_at IS NULL
    AND location_record.deleted_at IS NULL
    AND customer_record.deleted_at IS NULL
  LIMIT 1
`;

function mapLeadListRow(row: LeadListRow): LeadListItem {
  return {
    id: row.id,
    location: {
      id: row.locationId,
      name: row.locationName,
      code: row.locationCode,
    },
    customer: {
      id: row.customerId,
      customerType: row.customerType,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      companyName: row.customerCompanyName,
      phone: row.customerPhone,
    },
    assignedTo:
      row.assignedToUserId === null
        ? null
        : {
            id: row.assignedToUserId,
            firstName: row.assignedToFirstName ?? "",
            lastName: row.assignedToLastName ?? "",
          },
    source: row.source,
    status: row.status,
    priority: row.priority,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    nextFollowUpAt: row.nextFollowUpAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapLeadDetailsRow(row: LeadDetailsRow): LeadDetails {
  return {
    ...mapLeadListRow(row),
    lastContactAt: row.lastContactAt,
    convertedAt: row.convertedAt,
    lostReason: row.lostReason,
    notes: row.notes,
    createdBy: {
      id: row.createdByUserId,
      firstName: row.createdByFirstName,
      lastName: row.createdByLastName,
    },
  };
}

export async function getCustomers(
  input: ListCustomersRepositoryInput,
): Promise<CustomerListPage> {
  const whereClauses = ["c.tenant_id = ?", "c.deleted_at IS NULL"];
  const parameters: Array<string | number> = [input.tenantId];

  if (input.status) {
    whereClauses.push("c.status = ?");
    parameters.push(input.status);
  }

  if (input.customerType) {
    whereClauses.push("c.customer_type = ?");
    parameters.push(input.customerType);
  }

  if (input.assignedToUserId) {
    whereClauses.push("c.assigned_to_user_id = ?");
    parameters.push(input.assignedToUserId);
  }

  if (input.search) {
    whereClauses.push(`
      CONCAT_WS(
        ' ',
        COALESCE(c.first_name, ''),
        COALESCE(c.last_name, ''),
        COALESCE(c.company_name, ''),
        COALESCE(c.email, ''),
        c.phone,
        COALESCE(c.secondary_phone, '')
      ) LIKE ?
    `);
    parameters.push(`%${input.search}%`);
  }

  const fromAndWhere = `
    FROM customers c
    LEFT JOIN users assigned
      ON assigned.id = c.assigned_to_user_id
      AND assigned.tenant_id = c.tenant_id
      AND assigned.deleted_at IS NULL
    WHERE ${whereClauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;

  const [[customerRows], [countRows]] = await Promise.all([
    database.execute<CustomerListRow[]>(
      `
        SELECT
          c.id,
          c.customer_type AS customerType,
          c.first_name AS firstName,
          c.last_name AS lastName,
          c.company_name AS companyName,
          c.email,
          c.phone,
          c.secondary_phone AS secondaryPhone,
          c.city,
          c.country_code AS countryCode,
          c.status,
          assigned.id AS assignedToUserId,
          assigned.first_name AS assignedToFirstName,
          assigned.last_name AS assignedToLastName,
          c.created_at AS createdAt,
          c.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY c.created_at DESC, c.id DESC
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
    customers: customerRows.map((row) => ({
      id: row.id,
      customerType: row.customerType,
      firstName: row.firstName,
      lastName: row.lastName,
      companyName: row.companyName,
      email: row.email,
      phone: row.phone,
      secondaryPhone: row.secondaryPhone,
      city: row.city,
      countryCode: row.countryCode,
      status: row.status,
      assignedTo:
        row.assignedToUserId === null
          ? null
          : {
              id: row.assignedToUserId,
              firstName: row.assignedToFirstName ?? "",
              lastName: row.assignedToLastName ?? "",
            },
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

export async function getCustomerById(
  tenantId: number,
  customerId: number,
): Promise<CustomerDetails | null> {
  const [rows] = await database.execute<CustomerDetailsRow[]>(
    CUSTOMER_DETAILS_QUERY,
    [customerId, tenantId],
  );
  const row = rows[0];

  return row ? mapCustomerDetailsRow(row) : null;
}

export async function createCustomer(
  input: CreateCustomerRepositoryInput,
): Promise<CreateCustomerRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    if (input.assignedToUserId !== null) {
      const [assigneeRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM users
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.assignedToUserId, input.tenantId],
      );

      if (!assigneeRows[0]) {
        await connection.rollback();

        return { outcome: "ASSIGNEE_NOT_FOUND" };
      }
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO customers (
          tenant_id,
          customer_type,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          secondary_phone,
          address_line_1,
          address_line_2,
          city,
          postal_code,
          country_code,
          status,
          assigned_to_user_id,
          notes,
          created_by_user_id
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PROSPECT', ?, ?, ?
        )
      `,
      [
        input.tenantId,
        input.customerType,
        input.firstName,
        input.lastName,
        input.companyName,
        input.email,
        input.phone,
        input.secondaryPhone,
        input.addressLine1,
        input.addressLine2,
        input.city,
        input.postalCode,
        input.countryCode,
        input.assignedToUserId,
        input.notes,
        input.createdByUserId,
      ],
    );

    const [customerRows] = await connection.execute<CustomerDetailsRow[]>(
      CUSTOMER_DETAILS_QUERY,
      [insertResult.insertId, input.tenantId],
    );
    const customer = customerRows[0];

    if (!customer) {
      throw new Error("Created customer could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      customer: mapCustomerDetailsRow(customer),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCustomer(
  input: UpdateCustomerRepositoryInput,
): Promise<UpdateCustomerRepositoryResult> {
  const setClauses: string[] = [];
  const values: Array<string | number | null> = [];

  function addChange(
    column: string,
    value: string | number | null | undefined,
  ): void {
    if (value !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(value);
    }
  }

  addChange("customer_type", input.changes.customerType);
  addChange("first_name", input.changes.firstName);
  addChange("last_name", input.changes.lastName);
  addChange("company_name", input.changes.companyName);
  addChange("email", input.changes.email);
  addChange("phone", input.changes.phone);
  addChange("secondary_phone", input.changes.secondaryPhone);
  addChange("address_line_1", input.changes.addressLine1);
  addChange("address_line_2", input.changes.addressLine2);
  addChange("city", input.changes.city);
  addChange("postal_code", input.changes.postalCode);
  addChange("country_code", input.changes.countryCode);
  addChange("assigned_to_user_id", input.changes.assignedToUserId);
  addChange("notes", input.changes.notes);

  if (setClauses.length === 0) {
    throw new Error("At least one customer change is required");
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP(3)");
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [customerRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM customers
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.customerId, input.tenantId],
    );

    if (!customerRows[0]) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (
      input.changes.assignedToUserId !== undefined &&
      input.changes.assignedToUserId !== null
    ) {
      const [assigneeRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM users
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.changes.assignedToUserId, input.tenantId],
      );

      if (!assigneeRows[0]) {
        await connection.rollback();

        return { outcome: "ASSIGNEE_NOT_FOUND" };
      }
    }

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE customers
        SET ${setClauses.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [...values, input.customerId, input.tenantId],
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error("Customer could not be updated");
    }

    const [updatedRows] = await connection.execute<CustomerDetailsRow[]>(
      CUSTOMER_DETAILS_QUERY,
      [input.customerId, input.tenantId],
    );
    const customer = updatedRows[0];

    if (!customer) {
      throw new Error("Updated customer could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      customer: mapCustomerDetailsRow(customer),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCustomerStatus(
  input: UpdateCustomerStatusRepositoryInput,
): Promise<UpdateCustomerStatusRepositoryResult> {
  const allowedTransitions: Record<
    CustomerStatus,
    readonly CustomerStatus[]
  > = {
    PROSPECT: ["CUSTOMER", "INACTIVE"],
    CUSTOMER: ["INACTIVE"],
    INACTIVE: ["PROSPECT", "CUSTOMER"],
  };
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<CustomerStatusRow[]>(
      `
        SELECT status
        FROM customers
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.customerId, input.tenantId],
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
        UPDATE customers
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [input.status, input.customerId, input.tenantId],
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error("Customer status could not be updated");
    }

    const [updatedRows] = await connection.execute<CustomerDetailsRow[]>(
      CUSTOMER_DETAILS_QUERY,
      [input.customerId, input.tenantId],
    );
    const customer = updatedRows[0];

    if (!customer) {
      throw new Error("Updated customer could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      customer: mapCustomerDetailsRow(customer),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteCustomer(
  input: DeleteCustomerRepositoryInput,
): Promise<DeleteCustomerRepositoryResult> {
  const [result] = await database.execute<ResultSetHeader>(
    `
      UPDATE customers
      SET status = 'INACTIVE',
          deleted_at = CURRENT_TIMESTAMP(3),
          updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
    `,
    [input.customerId, input.tenantId],
  );

  return result.affectedRows === 1
    ? { outcome: "DELETED" }
    : { outcome: "NOT_FOUND" };
}

export async function restoreCustomer(
  input: RestoreCustomerRepositoryInput,
): Promise<RestoreCustomerRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [customerRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM customers
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NOT NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.customerId, input.tenantId],
    );

    if (!customerRows[0]) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    const [restoreResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE customers
        SET status = 'PROSPECT',
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NOT NULL
      `,
      [input.customerId, input.tenantId],
    );

    if (restoreResult.affectedRows !== 1) {
      throw new Error("Customer could not be restored");
    }

    const [restoredRows] = await connection.execute<CustomerDetailsRow[]>(
      CUSTOMER_DETAILS_QUERY,
      [input.customerId, input.tenantId],
    );
    const customer = restoredRows[0];

    if (!customer) {
      throw new Error("Restored customer could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "RESTORED",
      customer: mapCustomerDetailsRow(customer),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getLeads(
  input: ListLeadsRepositoryInput,
): Promise<LeadListPage> {
  const whereClauses = [
    "lead_record.tenant_id = ?",
    "lead_record.deleted_at IS NULL",
    "location_record.deleted_at IS NULL",
    "customer_record.deleted_at IS NULL",
  ];
  const parameters: Array<string | number> = [input.tenantId];

  if (input.status) {
    whereClauses.push("lead_record.status = ?");
    parameters.push(input.status);
  }

  if (input.priority) {
    whereClauses.push("lead_record.priority = ?");
    parameters.push(input.priority);
  }

  if (input.source) {
    whereClauses.push("lead_record.source = ?");
    parameters.push(input.source);
  }

  if (input.locationId) {
    whereClauses.push("lead_record.location_id = ?");
    parameters.push(input.locationId);
  }

  if (input.customerId) {
    whereClauses.push("lead_record.customer_id = ?");
    parameters.push(input.customerId);
  }

  if (input.assignedToUserId) {
    whereClauses.push("lead_record.assigned_to_user_id = ?");
    parameters.push(input.assignedToUserId);
  }

  if (input.search) {
    whereClauses.push(`
      CONCAT_WS(
        ' ',
        COALESCE(customer_record.first_name, ''),
        COALESCE(customer_record.last_name, ''),
        COALESCE(customer_record.company_name, ''),
        COALESCE(customer_record.email, ''),
        customer_record.phone,
        location_record.name,
        location_record.code
      ) LIKE ?
    `);
    parameters.push(`%${input.search}%`);
  }

  const fromAndWhere = `
    FROM leads lead_record
    INNER JOIN locations location_record
      ON location_record.id = lead_record.location_id
      AND location_record.tenant_id = lead_record.tenant_id
    INNER JOIN customers customer_record
      ON customer_record.id = lead_record.customer_id
      AND customer_record.tenant_id = lead_record.tenant_id
    LEFT JOIN users assigned
      ON assigned.id = lead_record.assigned_to_user_id
      AND assigned.tenant_id = lead_record.tenant_id
      AND assigned.deleted_at IS NULL
    WHERE ${whereClauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;

  const [[leadRows], [countRows]] = await Promise.all([
    database.execute<LeadListRow[]>(
      `
        SELECT
          lead_record.id,
          location_record.id AS locationId,
          location_record.name AS locationName,
          location_record.code AS locationCode,
          customer_record.id AS customerId,
          customer_record.customer_type AS customerType,
          customer_record.first_name AS customerFirstName,
          customer_record.last_name AS customerLastName,
          customer_record.company_name AS customerCompanyName,
          customer_record.phone AS customerPhone,
          assigned.id AS assignedToUserId,
          assigned.first_name AS assignedToFirstName,
          assigned.last_name AS assignedToLastName,
          lead_record.source,
          lead_record.status,
          lead_record.priority,
          lead_record.budget_min AS budgetMin,
          lead_record.budget_max AS budgetMax,
          lead_record.next_follow_up_at AS nextFollowUpAt,
          lead_record.created_at AS createdAt,
          lead_record.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY lead_record.created_at DESC, lead_record.id DESC
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
    leads: leadRows.map(mapLeadListRow),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function getLeadById(
  tenantId: number,
  leadId: number,
): Promise<LeadDetails | null> {
  const [rows] = await database.execute<LeadDetailsRow[]>(
    LEAD_DETAILS_QUERY,
    [leadId, tenantId],
  );
  const row = rows[0];

  return row ? mapLeadDetailsRow(row) : null;
}

export async function createLead(
  input: CreateLeadRepositoryInput,
): Promise<CreateLeadRepositoryResult> {
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

    if (input.assignedToUserId !== null) {
      const [assigneeRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM users
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.assignedToUserId, input.tenantId],
      );

      if (!assigneeRows[0]) {
        await connection.rollback();

        return { outcome: "ASSIGNEE_NOT_FOUND" };
      }
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO leads (
          tenant_id,
          location_id,
          customer_id,
          assigned_to_user_id,
          source,
          status,
          priority,
          budget_min,
          budget_max,
          last_contact_at,
          next_follow_up_at,
          notes,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.tenantId,
        input.locationId,
        input.customerId,
        input.assignedToUserId,
        input.source,
        input.priority,
        input.budgetMin,
        input.budgetMax,
        input.lastContactAt,
        input.nextFollowUpAt,
        input.notes,
        input.createdByUserId,
      ],
    );

    const [leadRows] = await connection.execute<LeadDetailsRow[]>(
      LEAD_DETAILS_QUERY,
      [insertResult.insertId, input.tenantId],
    );
    const lead = leadRows[0];

    if (!lead) {
      throw new Error("Created lead could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      lead: mapLeadDetailsRow(lead),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLead(
  input: UpdateLeadRepositoryInput,
): Promise<UpdateLeadRepositoryResult> {
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
  addChange("customer_id", input.changes.customerId);
  addChange("assigned_to_user_id", input.changes.assignedToUserId);
  addChange("source", input.changes.source);
  addChange("priority", input.changes.priority);
  addChange("budget_min", input.changes.budgetMin);
  addChange("budget_max", input.changes.budgetMax);
  addChange("last_contact_at", input.changes.lastContactAt);
  addChange("next_follow_up_at", input.changes.nextFollowUpAt);
  addChange("notes", input.changes.notes);

  if (setClauses.length === 0) {
    throw new Error("At least one lead change is required");
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP(3)");
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

      return { outcome: "NOT_FOUND" };
    }

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

    if (input.changes.customerId !== undefined) {
      const [customerRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM customers
          WHERE id = ?
            AND tenant_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.changes.customerId, input.tenantId],
      );

      if (!customerRows[0]) {
        await connection.rollback();

        return { outcome: "CUSTOMER_NOT_FOUND" };
      }
    }

    if (
      input.changes.assignedToUserId !== undefined &&
      input.changes.assignedToUserId !== null
    ) {
      const [assigneeRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM users
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.changes.assignedToUserId, input.tenantId],
      );

      if (!assigneeRows[0]) {
        await connection.rollback();

        return { outcome: "ASSIGNEE_NOT_FOUND" };
      }
    }

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE leads
        SET ${setClauses.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [...values, input.leadId, input.tenantId],
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error("Lead could not be updated");
    }

    const [updatedRows] = await connection.execute<LeadDetailsRow[]>(
      LEAD_DETAILS_QUERY,
      [input.leadId, input.tenantId],
    );
    const lead = updatedRows[0];

    if (!lead) {
      throw new Error("Updated lead could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      lead: mapLeadDetailsRow(lead),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLeadStatus(
  input: UpdateLeadStatusRepositoryInput,
): Promise<UpdateLeadStatusRepositoryResult> {
  const allowedTransitions: Record<LeadStatus, readonly LeadStatus[]> = {
    NEW: ["CONTACTED", "LOST"],
    CONTACTED: ["QUALIFIED", "LOST"],
    QUALIFIED: ["WON", "LOST"],
    WON: [],
    LOST: ["NEW"],
  };
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.execute<LeadStatusRow[]>(
      `
        SELECT status
        FROM leads
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.leadId, input.tenantId],
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
        UPDATE leads
        SET status = ?,
            converted_at = CASE
              WHEN ? = 'WON' THEN CURRENT_TIMESTAMP(3)
              ELSE NULL
            END,
            lost_reason = CASE
              WHEN ? = 'LOST' THEN ?
              ELSE NULL
            END,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [
        input.status,
        input.status,
        input.status,
        input.lostReason,
        input.leadId,
        input.tenantId,
      ],
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error("Lead status could not be updated");
    }

    await connection.execute<ResultSetHeader>(
      `
        INSERT INTO lead_activities (
          tenant_id,
          lead_id,
          user_id,
          activity_type,
          status,
          subject,
          details,
          outcome,
          completed_at
        )
        VALUES (?, ?, ?, 'STATUS_CHANGE', 'COMPLETED', ?, ?, ?, CURRENT_TIMESTAMP(3))
      `,
      [
        input.tenantId,
        input.leadId,
        input.actorUserId,
        `Lead status changed to ${input.status}`,
        `${currentStatus} -> ${input.status}`,
        input.status === "LOST" ? input.lostReason : null,
      ],
    );

    const [updatedRows] = await connection.execute<LeadDetailsRow[]>(
      LEAD_DETAILS_QUERY,
      [input.leadId, input.tenantId],
    );
    const lead = updatedRows[0];

    if (!lead) {
      throw new Error("Updated lead could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      lead: mapLeadDetailsRow(lead),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteLead(
  input: DeleteLeadRepositoryInput,
): Promise<DeleteLeadRepositoryResult> {
  const [result] = await database.execute<ResultSetHeader>(
    `
      UPDATE leads
      SET deleted_at = CURRENT_TIMESTAMP(3),
          updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
    `,
    [input.leadId, input.tenantId],
  );

  return result.affectedRows === 1
    ? { outcome: "DELETED" }
    : { outcome: "NOT_FOUND" };
}

export async function restoreLead(
  input: RestoreLeadRepositoryInput,
): Promise<RestoreLeadRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [leadRows] = await connection.execute<RestorableLeadRow[]>(
      `
        SELECT
          EXISTS(
            SELECT 1
            FROM locations location_record
            WHERE location_record.id = lead_record.location_id
              AND location_record.tenant_id = lead_record.tenant_id
              AND location_record.status = 'ACTIVE'
              AND location_record.deleted_at IS NULL
          ) AS locationAvailable,
          EXISTS(
            SELECT 1
            FROM customers customer_record
            WHERE customer_record.id = lead_record.customer_id
              AND customer_record.tenant_id = lead_record.tenant_id
              AND customer_record.deleted_at IS NULL
          ) AS customerAvailable
        FROM leads lead_record
        WHERE lead_record.id = ?
          AND lead_record.tenant_id = ?
          AND lead_record.deleted_at IS NOT NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.leadId, input.tenantId],
    );
    const lead = leadRows[0];

    if (!lead) {
      await connection.rollback();

      return { outcome: "NOT_FOUND" };
    }

    if (!Boolean(lead.locationAvailable)) {
      await connection.rollback();

      return { outcome: "LOCATION_UNAVAILABLE" };
    }

    if (!Boolean(lead.customerAvailable)) {
      await connection.rollback();

      return { outcome: "CUSTOMER_UNAVAILABLE" };
    }

    const [restoreResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE leads
        SET status = 'NEW',
            converted_at = NULL,
            lost_reason = NULL,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NOT NULL
      `,
      [input.leadId, input.tenantId],
    );

    if (restoreResult.affectedRows !== 1) {
      throw new Error("Lead could not be restored");
    }

    const [restoredRows] = await connection.execute<LeadDetailsRow[]>(
      LEAD_DETAILS_QUERY,
      [input.leadId, input.tenantId],
    );
    const restoredLead = restoredRows[0];

    if (!restoredLead) {
      throw new Error("Restored lead could not be reloaded");
    }

    await connection.commit();

    return {
      outcome: "RESTORED",
      lead: mapLeadDetailsRow(restoredLead),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
