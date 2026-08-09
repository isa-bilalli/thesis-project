import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { database } from "../../config/database.js";
import type { LeadStatus } from "./crm.repository.js";
import type { VehicleStatus } from "../inventory/inventory.repository.js";

export type TestDriveStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface TestDriveDetails {
  id: number;
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
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  status: TestDriveStatus;
  notes: string | null;
  cancellationReason: string | null;
  createdBy: { id: number; firstName: string; lastName: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTestDrivesRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  status?: TestDriveStatus;
  locationId?: number;
  leadId?: number;
  customerId?: number;
  vehicleId?: number;
  salespersonUserId?: number;
  scheduledFrom?: Date;
  scheduledTo?: Date;
}

export interface TestDriveListPage {
  testDrives: TestDriveDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TestDriveScheduleValues {
  locationId: number;
  leadId: number | null;
  customerId: number;
  vehicleId: number;
  salespersonUserId: number;
  scheduledStart: Date;
  scheduledEnd: Date;
}

export interface CreateTestDriveRepositoryInput extends TestDriveScheduleValues {
  tenantId: number;
  createdByUserId: number;
  notes: string | null;
}

export interface UpdateTestDriveRepositoryInput {
  tenantId: number;
  testDriveId: number;
  changes: {
    locationId?: number;
    leadId?: number | null;
    customerId?: number;
    vehicleId?: number;
    salespersonUserId?: number;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    notes?: string | null;
  };
}

export interface UpdateTestDriveStatusRepositoryInput {
  tenantId: number;
  testDriveId: number;
  status: TestDriveStatus;
  cancellationReason: string | null;
}

type ReferenceFailure =
  | { outcome: "LOCATION_NOT_FOUND" }
  | { outcome: "CUSTOMER_NOT_FOUND" }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "LEAD_CUSTOMER_MISMATCH" }
  | { outcome: "VEHICLE_NOT_FOUND" }
  | { outcome: "VEHICLE_UNAVAILABLE"; status: VehicleStatus }
  | { outcome: "SALESPERSON_NOT_FOUND" };

type ScheduleConflict =
  | { outcome: "VEHICLE_CONFLICT" }
  | { outcome: "SALESPERSON_CONFLICT" };

export type CreateTestDriveRepositoryResult =
  | { outcome: "CREATED"; testDrive: TestDriveDetails }
  | ReferenceFailure
  | ScheduleConflict;

export type UpdateTestDriveRepositoryResult =
  | { outcome: "UPDATED"; testDrive: TestDriveDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_STATE"; currentStatus: TestDriveStatus }
  | { outcome: "INVALID_TIME_RANGE" }
  | ReferenceFailure
  | ScheduleConflict;

export type UpdateTestDriveStatusRepositoryResult =
  | { outcome: "UPDATED"; testDrive: TestDriveDetails }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: TestDriveStatus };

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface LeadCustomerRow extends RowDataPacket {
  customerId: number;
}

interface VehicleStatusRow extends RowDataPacket {
  status: VehicleStatus;
}

interface TestDriveStateRow extends RowDataPacket, TestDriveScheduleValues {
  status: TestDriveStatus;
}

interface StatusRow extends RowDataPacket {
  status: TestDriveStatus;
}

interface ScheduleConflictRow extends RowDataPacket {
  vehicleId: number;
  salespersonUserId: number;
}

interface TestDriveRow extends RowDataPacket {
  id: number;
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
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  status: TestDriveStatus;
  notes: string | null;
  cancellationReason: string | null;
  createdByUserId: number;
  createdByFirstName: string;
  createdByLastName: string;
  createdAt: Date;
  updatedAt: Date;
}

const TEST_DRIVE_QUERY = `
  SELECT
    test_drive.id,
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
    test_drive.scheduled_start AS scheduledStart,
    test_drive.scheduled_end AS scheduledEnd,
    test_drive.actual_start AS actualStart,
    test_drive.actual_end AS actualEnd,
    test_drive.status,
    test_drive.notes,
    test_drive.cancellation_reason AS cancellationReason,
    creator.id AS createdByUserId,
    creator.first_name AS createdByFirstName,
    creator.last_name AS createdByLastName,
    test_drive.created_at AS createdAt,
    test_drive.updated_at AS updatedAt
  FROM test_drives test_drive
  INNER JOIN locations location_record
    ON location_record.id = test_drive.location_id
    AND location_record.tenant_id = test_drive.tenant_id
  LEFT JOIN leads lead_record
    ON lead_record.id = test_drive.lead_id
    AND lead_record.tenant_id = test_drive.tenant_id
  INNER JOIN customers customer
    ON customer.id = test_drive.customer_id
    AND customer.tenant_id = test_drive.tenant_id
  INNER JOIN vehicles vehicle
    ON vehicle.id = test_drive.vehicle_id
    AND vehicle.tenant_id = test_drive.tenant_id
  INNER JOIN users salesperson
    ON salesperson.id = test_drive.salesperson_user_id
    AND salesperson.tenant_id = test_drive.tenant_id
  INNER JOIN users creator
    ON creator.id = test_drive.created_by_user_id
    AND creator.tenant_id = test_drive.tenant_id
  WHERE test_drive.tenant_id = ?
`;

function mapTestDrive(row: TestDriveRow): TestDriveDetails {
  return {
    id: row.id,
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
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    actualStart: row.actualStart,
    actualEnd: row.actualEnd,
    status: row.status,
    notes: row.notes,
    cancellationReason: row.cancellationReason,
    createdBy: {
      id: row.createdByUserId,
      firstName: row.createdByFirstName,
      lastName: row.createdByLastName,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function validateReferences(
  connection: PoolConnection,
  tenantId: number,
  schedule: TestDriveScheduleValues,
): Promise<ReferenceFailure | null> {
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
    [schedule.locationId, tenantId],
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
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [schedule.customerId, tenantId],
  );

  if (!customerRows[0]) {
    return { outcome: "CUSTOMER_NOT_FOUND" };
  }

  if (schedule.leadId !== null) {
    const [leadRows] = await connection.execute<LeadCustomerRow[]>(
      `
        SELECT customer_id AS customerId
        FROM leads
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [schedule.leadId, tenantId],
    );
    const lead = leadRows[0];

    if (!lead) {
      return { outcome: "LEAD_NOT_FOUND" };
    }

    if (lead.customerId !== schedule.customerId) {
      return { outcome: "LEAD_CUSTOMER_MISMATCH" };
    }
  }

  const [vehicleRows] = await connection.execute<VehicleStatusRow[]>(
    `
      SELECT status
      FROM vehicles
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
    [schedule.vehicleId, tenantId],
  );
  const vehicle = vehicleRows[0];

  if (!vehicle) {
    return { outcome: "VEHICLE_NOT_FOUND" };
  }

  if (vehicle.status !== "AVAILABLE" && vehicle.status !== "RESERVED") {
    return { outcome: "VEHICLE_UNAVAILABLE", status: vehicle.status };
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
      FOR UPDATE
    `,
    [schedule.salespersonUserId, tenantId],
  );

  if (!salespersonRows[0]) {
    return { outcome: "SALESPERSON_NOT_FOUND" };
  }

  return null;
}

async function findScheduleConflict(
  connection: PoolConnection,
  tenantId: number,
  schedule: TestDriveScheduleValues,
  excludedTestDriveId?: number,
): Promise<ScheduleConflict | null> {
  const exclusion = excludedTestDriveId === undefined ? "" : "AND id <> ?";
  const parameters: Array<number | Date> = [
    tenantId,
    schedule.scheduledEnd,
    schedule.scheduledStart,
    schedule.vehicleId,
    schedule.salespersonUserId,
  ];

  if (excludedTestDriveId !== undefined) {
    parameters.push(excludedTestDriveId);
  }

  const [conflictRows] = await connection.execute<ScheduleConflictRow[]>(
    `
      SELECT
        vehicle_id AS vehicleId,
        salesperson_user_id AS salespersonUserId
      FROM test_drives
      WHERE tenant_id = ?
        AND status IN ('SCHEDULED', 'IN_PROGRESS')
        AND scheduled_start < ?
        AND scheduled_end > ?
        AND (vehicle_id = ? OR salesperson_user_id = ?)
        ${exclusion}
      FOR UPDATE
    `,
    parameters,
  );

  if (conflictRows.some((row) => row.vehicleId === schedule.vehicleId)) {
    return { outcome: "VEHICLE_CONFLICT" };
  }

  if (
    conflictRows.some(
      (row) => row.salespersonUserId === schedule.salespersonUserId,
    )
  ) {
    return { outcome: "SALESPERSON_CONFLICT" };
  }

  return null;
}

async function reloadTestDrive(
  connection: PoolConnection,
  tenantId: number,
  testDriveId: number,
): Promise<TestDriveDetails> {
  const [rows] = await connection.execute<TestDriveRow[]>(
    `${TEST_DRIVE_QUERY}
     AND test_drive.id = ?
     LIMIT 1`,
    [tenantId, testDriveId],
  );
  const testDrive = rows[0];

  if (!testDrive) {
    throw new Error("Test drive could not be reloaded");
  }

  return mapTestDrive(testDrive);
}

export async function listTestDrives(
  input: ListTestDrivesRepositoryInput,
): Promise<TestDriveListPage> {
  const clauses = ["test_drive.tenant_id = ?"];
  const parameters: Array<number | string | Date> = [input.tenantId];

  const addFilter = (column: string, value: number | string | Date | undefined): void => {
    if (value !== undefined) {
      clauses.push(`${column} = ?`);
      parameters.push(value);
    }
  };

  addFilter("test_drive.status", input.status);
  addFilter("test_drive.location_id", input.locationId);
  addFilter("test_drive.lead_id", input.leadId);
  addFilter("test_drive.customer_id", input.customerId);
  addFilter("test_drive.vehicle_id", input.vehicleId);
  addFilter("test_drive.salesperson_user_id", input.salespersonUserId);

  if (input.scheduledFrom) {
    clauses.push("test_drive.scheduled_start >= ?");
    parameters.push(input.scheduledFrom);
  }

  if (input.scheduledTo) {
    clauses.push("test_drive.scheduled_start <= ?");
    parameters.push(input.scheduledTo);
  }

  const fromAndWhere = `
    FROM test_drives test_drive
    INNER JOIN locations location_record
      ON location_record.id = test_drive.location_id
      AND location_record.tenant_id = test_drive.tenant_id
    LEFT JOIN leads lead_record
      ON lead_record.id = test_drive.lead_id
      AND lead_record.tenant_id = test_drive.tenant_id
    INNER JOIN customers customer
      ON customer.id = test_drive.customer_id
      AND customer.tenant_id = test_drive.tenant_id
    INNER JOIN vehicles vehicle
      ON vehicle.id = test_drive.vehicle_id
      AND vehicle.tenant_id = test_drive.tenant_id
    INNER JOIN users salesperson
      ON salesperson.id = test_drive.salesperson_user_id
      AND salesperson.tenant_id = test_drive.tenant_id
    INNER JOIN users creator
      ON creator.id = test_drive.created_by_user_id
      AND creator.tenant_id = test_drive.tenant_id
    WHERE ${clauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;
  const [[rows], [countRows]] = await Promise.all([
    database.execute<TestDriveRow[]>(
      `
        SELECT
          test_drive.id,
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
          test_drive.scheduled_start AS scheduledStart,
          test_drive.scheduled_end AS scheduledEnd,
          test_drive.actual_start AS actualStart,
          test_drive.actual_end AS actualEnd,
          test_drive.status,
          test_drive.notes,
          test_drive.cancellation_reason AS cancellationReason,
          creator.id AS createdByUserId,
          creator.first_name AS createdByFirstName,
          creator.last_name AS createdByLastName,
          test_drive.created_at AS createdAt,
          test_drive.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY
          CASE WHEN test_drive.status IN ('SCHEDULED', 'IN_PROGRESS') THEN 0 ELSE 1 END,
          CASE WHEN test_drive.status IN ('SCHEDULED', 'IN_PROGRESS') THEN test_drive.scheduled_start END ASC,
          test_drive.scheduled_start DESC,
          test_drive.id DESC
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
    testDrives: rows.map(mapTestDrive),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function getTestDriveById(
  tenantId: number,
  testDriveId: number,
): Promise<TestDriveDetails | null> {
  const [rows] = await database.execute<TestDriveRow[]>(
    `${TEST_DRIVE_QUERY}
     AND test_drive.id = ?
     LIMIT 1`,
    [tenantId, testDriveId],
  );

  return rows[0] ? mapTestDrive(rows[0]) : null;
}

export async function createTestDrive(
  input: CreateTestDriveRepositoryInput,
): Promise<CreateTestDriveRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const referenceFailure = await validateReferences(
      connection,
      input.tenantId,
      input,
    );

    if (referenceFailure) {
      await connection.rollback();
      return referenceFailure;
    }

    const conflict = await findScheduleConflict(
      connection,
      input.tenantId,
      input,
    );

    if (conflict) {
      await connection.rollback();
      return conflict;
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO test_drives (
          tenant_id,
          location_id,
          lead_id,
          customer_id,
          vehicle_id,
          salesperson_user_id,
          scheduled_start,
          scheduled_end,
          status,
          notes,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
      `,
      [
        input.tenantId,
        input.locationId,
        input.leadId,
        input.customerId,
        input.vehicleId,
        input.salespersonUserId,
        input.scheduledStart,
        input.scheduledEnd,
        input.notes,
        input.createdByUserId,
      ],
    );
    const testDrive = await reloadTestDrive(
      connection,
      input.tenantId,
      insertResult.insertId,
    );
    await connection.commit();

    return { outcome: "CREATED", testDrive };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateTestDrive(
  input: UpdateTestDriveRepositoryInput,
): Promise<UpdateTestDriveRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const [stateRows] = await connection.execute<TestDriveStateRow[]>(
      `
        SELECT
          location_id AS locationId,
          lead_id AS leadId,
          customer_id AS customerId,
          vehicle_id AS vehicleId,
          salesperson_user_id AS salespersonUserId,
          scheduled_start AS scheduledStart,
          scheduled_end AS scheduledEnd,
          status
        FROM test_drives
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.testDriveId, input.tenantId],
    );
    const current = stateRows[0];

    if (!current) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (current.status !== "SCHEDULED") {
      await connection.rollback();
      return { outcome: "INVALID_STATE", currentStatus: current.status };
    }

    const schedule: TestDriveScheduleValues = {
      locationId: input.changes.locationId ?? current.locationId,
      leadId:
        input.changes.leadId === undefined
          ? current.leadId
          : input.changes.leadId,
      customerId: input.changes.customerId ?? current.customerId,
      vehicleId: input.changes.vehicleId ?? current.vehicleId,
      salespersonUserId:
        input.changes.salespersonUserId ?? current.salespersonUserId,
      scheduledStart: input.changes.scheduledStart ?? current.scheduledStart,
      scheduledEnd: input.changes.scheduledEnd ?? current.scheduledEnd,
    };

    if (schedule.scheduledEnd <= schedule.scheduledStart) {
      await connection.rollback();
      return { outcome: "INVALID_TIME_RANGE" };
    }

    const referenceFailure = await validateReferences(
      connection,
      input.tenantId,
      schedule,
    );

    if (referenceFailure) {
      await connection.rollback();
      return referenceFailure;
    }

    const conflict = await findScheduleConflict(
      connection,
      input.tenantId,
      schedule,
      input.testDriveId,
    );

    if (conflict) {
      await connection.rollback();
      return conflict;
    }

    const clauses: string[] = [];
    const values: Array<number | Date | string | null> = [];
    const addChange = (
      column: string,
      value: number | Date | string | null | undefined,
    ): void => {
      if (value !== undefined) {
        clauses.push(`${column} = ?`);
        values.push(value);
      }
    };

    addChange("location_id", input.changes.locationId);
    addChange("lead_id", input.changes.leadId);
    addChange("customer_id", input.changes.customerId);
    addChange("vehicle_id", input.changes.vehicleId);
    addChange("salesperson_user_id", input.changes.salespersonUserId);
    addChange("scheduled_start", input.changes.scheduledStart);
    addChange("scheduled_end", input.changes.scheduledEnd);
    addChange("notes", input.changes.notes);
    clauses.push("updated_at = CURRENT_TIMESTAMP(3)");

    await connection.execute<ResultSetHeader>(
      `
        UPDATE test_drives
        SET ${clauses.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
      `,
      [...values, input.testDriveId, input.tenantId],
    );
    const testDrive = await reloadTestDrive(
      connection,
      input.tenantId,
      input.testDriveId,
    );
    await connection.commit();

    return { outcome: "UPDATED", testDrive };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateTestDriveStatus(
  input: UpdateTestDriveStatusRepositoryInput,
): Promise<UpdateTestDriveStatusRepositoryResult> {
  const transitions: Record<TestDriveStatus, readonly TestDriveStatus[]> = {
    SCHEDULED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    const [statusRows] = await connection.execute<StatusRow[]>(
      `
        SELECT status
        FROM test_drives
        WHERE id = ?
          AND tenant_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [input.testDriveId, input.tenantId],
    );
    const currentStatus = statusRows[0]?.status;

    if (!currentStatus) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (!transitions[currentStatus].includes(input.status)) {
      await connection.rollback();
      return { outcome: "INVALID_TRANSITION", currentStatus };
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE test_drives
        SET status = ?,
            actual_start = CASE
              WHEN ? = 'IN_PROGRESS' THEN COALESCE(actual_start, CURRENT_TIMESTAMP(3))
              ELSE actual_start
            END,
            actual_end = CASE
              WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP(3)
              WHEN ? = 'CANCELLED' AND actual_start IS NOT NULL
                THEN CURRENT_TIMESTAMP(3)
              ELSE actual_end
            END,
            cancellation_reason = CASE
              WHEN ? = 'CANCELLED' THEN ?
              ELSE NULL
            END,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
      `,
      [
        input.status,
        input.status,
        input.status,
        input.status,
        input.status,
        input.cancellationReason,
        input.testDriveId,
        input.tenantId,
      ],
    );
    const testDrive = await reloadTestDrive(
      connection,
      input.tenantId,
      input.testDriveId,
    );
    await connection.commit();

    return { outcome: "UPDATED", testDrive };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
