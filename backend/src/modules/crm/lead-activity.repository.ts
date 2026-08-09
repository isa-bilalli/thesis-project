import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { database } from "../../config/database.js";
import type { LeadStatus } from "./crm.repository.js";

export type LeadActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL"
  | "MEETING"
  | "FOLLOW_UP"
  | "STATUS_CHANGE";

export type LeadActivityStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface LeadActivity {
  id: number;
  lead: {
    id: number;
    status: LeadStatus;
    customer: {
      id: number;
      firstName: string | null;
      lastName: string | null;
      companyName: string | null;
      phone: string;
    };
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
  activityType: LeadActivityType;
  status: LeadActivityStatus;
  subject: string | null;
  details: string | null;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListLeadActivitiesRepositoryInput {
  tenantId: number;
  page: number;
  limit: number;
  leadId?: number;
  userId?: number;
  activityType?: LeadActivityType;
  status?: LeadActivityStatus;
  scheduledFrom?: Date;
  scheduledTo?: Date;
}

export interface LeadActivityListPage {
  activities: LeadActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateLeadActivityRepositoryInput {
  tenantId: number;
  leadId: number;
  userId: number;
  activityType: Exclude<LeadActivityType, "STATUS_CHANGE">;
  status: "SCHEDULED" | "COMPLETED";
  subject: string | null;
  details: string | null;
  outcome: string | null;
  scheduledAt: Date | null;
}

export interface UpdateLeadActivityRepositoryInput {
  tenantId: number;
  activityId: number;
  changes: {
    userId?: number;
    subject?: string | null;
    details?: string | null;
    scheduledAt?: Date;
  };
}

export interface UpdateLeadActivityStatusRepositoryInput {
  tenantId: number;
  activityId: number;
  status: LeadActivityStatus;
  outcome: string | null;
  scheduledAt: Date | null;
}

export type CreateLeadActivityRepositoryResult =
  | { outcome: "CREATED"; activity: LeadActivity }
  | { outcome: "LEAD_NOT_FOUND" }
  | { outcome: "USER_NOT_FOUND" };

export type UpdateLeadActivityRepositoryResult =
  | { outcome: "UPDATED"; activity: LeadActivity }
  | { outcome: "NOT_FOUND" }
  | { outcome: "USER_NOT_FOUND" }
  | { outcome: "INVALID_STATE"; currentStatus: LeadActivityStatus };

export type UpdateLeadActivityStatusRepositoryResult =
  | { outcome: "UPDATED"; activity: LeadActivity }
  | { outcome: "NOT_FOUND" }
  | { outcome: "INVALID_TRANSITION"; currentStatus: LeadActivityStatus };

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface ActivityStateRow extends RowDataPacket {
  leadId: number;
  activityType: LeadActivityType;
  status: LeadActivityStatus;
}

interface LeadActivityRow extends RowDataPacket {
  id: number;
  leadId: number;
  leadStatus: LeadStatus;
  customerId: number;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCompanyName: string | null;
  customerPhone: string;
  userId: number;
  userFirstName: string;
  userLastName: string;
  activityType: LeadActivityType;
  status: LeadActivityStatus;
  subject: string | null;
  details: string | null;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LEAD_ACTIVITY_QUERY = `
  SELECT
    activity.id,
    lead_record.id AS leadId,
    lead_record.status AS leadStatus,
    customer.id AS customerId,
    customer.first_name AS customerFirstName,
    customer.last_name AS customerLastName,
    customer.company_name AS customerCompanyName,
    customer.phone AS customerPhone,
    activity_user.id AS userId,
    activity_user.first_name AS userFirstName,
    activity_user.last_name AS userLastName,
    activity.activity_type AS activityType,
    activity.status,
    activity.subject,
    activity.details,
    activity.outcome,
    activity.scheduled_at AS scheduledAt,
    activity.completed_at AS completedAt,
    activity.created_at AS createdAt,
    activity.updated_at AS updatedAt
  FROM lead_activities activity
  INNER JOIN leads lead_record
    ON lead_record.id = activity.lead_id
    AND lead_record.tenant_id = activity.tenant_id
  INNER JOIN customers customer
    ON customer.id = lead_record.customer_id
    AND customer.tenant_id = lead_record.tenant_id
  INNER JOIN users activity_user
    ON activity_user.id = activity.user_id
    AND activity_user.tenant_id = activity.tenant_id
  WHERE activity.tenant_id = ?
    AND lead_record.deleted_at IS NULL
    AND customer.deleted_at IS NULL
`;

function mapLeadActivity(row: LeadActivityRow): LeadActivity {
  return {
    id: row.id,
    lead: {
      id: row.leadId,
      status: row.leadStatus,
      customer: {
        id: row.customerId,
        firstName: row.customerFirstName,
        lastName: row.customerLastName,
        companyName: row.customerCompanyName,
        phone: row.customerPhone,
      },
    },
    user: {
      id: row.userId,
      firstName: row.userFirstName,
      lastName: row.userLastName,
    },
    activityType: row.activityType,
    status: row.status,
    subject: row.subject,
    details: row.details,
    outcome: row.outcome,
    scheduledAt: row.scheduledAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function recalculateNextFollowUp(
  connection: PoolConnection,
  tenantId: number,
  leadId: number,
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `
      UPDATE leads
      SET next_follow_up_at = (
            SELECT MIN(activity.scheduled_at)
            FROM lead_activities activity
            WHERE activity.tenant_id = ?
              AND activity.lead_id = ?
              AND activity.activity_type = 'FOLLOW_UP'
              AND activity.status = 'SCHEDULED'
          ),
          updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
        AND tenant_id = ?
        AND deleted_at IS NULL
    `,
    [tenantId, leadId, leadId, tenantId],
  );
}

async function reloadActivity(
  connection: PoolConnection,
  tenantId: number,
  activityId: number,
): Promise<LeadActivity> {
  const [rows] = await connection.execute<LeadActivityRow[]>(
    `${LEAD_ACTIVITY_QUERY}
     AND activity.id = ?
     LIMIT 1`,
    [tenantId, activityId],
  );
  const activity = rows[0];

  if (!activity) {
    throw new Error("Lead activity could not be reloaded");
  }

  return mapLeadActivity(activity);
}

export async function listLeadActivities(
  input: ListLeadActivitiesRepositoryInput,
): Promise<LeadActivityListPage> {
  const whereClauses = [
    "activity.tenant_id = ?",
    "lead_record.deleted_at IS NULL",
    "customer.deleted_at IS NULL",
  ];
  const parameters: Array<string | number | Date> = [input.tenantId];

  if (input.leadId) {
    whereClauses.push("activity.lead_id = ?");
    parameters.push(input.leadId);
  }

  if (input.userId) {
    whereClauses.push("activity.user_id = ?");
    parameters.push(input.userId);
  }

  if (input.activityType) {
    whereClauses.push("activity.activity_type = ?");
    parameters.push(input.activityType);
  }

  if (input.status) {
    whereClauses.push("activity.status = ?");
    parameters.push(input.status);
  }

  if (input.scheduledFrom) {
    whereClauses.push("activity.scheduled_at >= ?");
    parameters.push(input.scheduledFrom);
  }

  if (input.scheduledTo) {
    whereClauses.push("activity.scheduled_at <= ?");
    parameters.push(input.scheduledTo);
  }

  const fromAndWhere = `
    FROM lead_activities activity
    INNER JOIN leads lead_record
      ON lead_record.id = activity.lead_id
      AND lead_record.tenant_id = activity.tenant_id
    INNER JOIN customers customer
      ON customer.id = lead_record.customer_id
      AND customer.tenant_id = lead_record.tenant_id
    INNER JOIN users activity_user
      ON activity_user.id = activity.user_id
      AND activity_user.tenant_id = activity.tenant_id
    WHERE ${whereClauses.join(" AND ")}
  `;
  const offset = (input.page - 1) * input.limit;
  const [[rows], [countRows]] = await Promise.all([
    database.execute<LeadActivityRow[]>(
      `
        SELECT
          activity.id,
          lead_record.id AS leadId,
          lead_record.status AS leadStatus,
          customer.id AS customerId,
          customer.first_name AS customerFirstName,
          customer.last_name AS customerLastName,
          customer.company_name AS customerCompanyName,
          customer.phone AS customerPhone,
          activity_user.id AS userId,
          activity_user.first_name AS userFirstName,
          activity_user.last_name AS userLastName,
          activity.activity_type AS activityType,
          activity.status,
          activity.subject,
          activity.details,
          activity.outcome,
          activity.scheduled_at AS scheduledAt,
          activity.completed_at AS completedAt,
          activity.created_at AS createdAt,
          activity.updated_at AS updatedAt
        ${fromAndWhere}
        ORDER BY
          CASE WHEN activity.status = 'SCHEDULED' THEN 0 ELSE 1 END,
          CASE WHEN activity.status = 'SCHEDULED' THEN activity.scheduled_at END ASC,
          activity.created_at DESC,
          activity.id DESC
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
    activities: rows.map(mapLeadActivity),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit),
    },
  };
}

export async function createLeadActivity(
  input: CreateLeadActivityRepositoryInput,
): Promise<CreateLeadActivityRepositoryResult> {
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

    const [userRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM users
        WHERE id = ?
          AND tenant_id = ?
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [input.userId, input.tenantId],
    );

    if (!userRows[0]) {
      await connection.rollback();
      return { outcome: "USER_NOT_FOUND" };
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
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
          scheduled_at,
          completed_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END
        )
      `,
      [
        input.tenantId,
        input.leadId,
        input.userId,
        input.activityType,
        input.status,
        input.subject,
        input.details,
        input.outcome,
        input.scheduledAt,
        input.status,
      ],
    );

    if (
      input.status === "COMPLETED" &&
      ["CALL", "EMAIL", "MEETING"].includes(input.activityType)
    ) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE leads
          SET last_contact_at = CURRENT_TIMESTAMP(3),
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND deleted_at IS NULL
        `,
        [input.leadId, input.tenantId],
      );
    }

    if (input.activityType === "FOLLOW_UP") {
      await recalculateNextFollowUp(connection, input.tenantId, input.leadId);
    }

    const activity = await reloadActivity(
      connection,
      input.tenantId,
      insertResult.insertId,
    );
    await connection.commit();

    return { outcome: "CREATED", activity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLeadActivity(
  input: UpdateLeadActivityRepositoryInput,
): Promise<UpdateLeadActivityRepositoryResult> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [stateRows] = await connection.execute<ActivityStateRow[]>(
      `
        SELECT
          activity.lead_id AS leadId,
          activity.activity_type AS activityType,
          activity.status
        FROM lead_activities activity
        INNER JOIN leads lead_record
          ON lead_record.id = activity.lead_id
          AND lead_record.tenant_id = activity.tenant_id
        WHERE activity.id = ?
          AND activity.tenant_id = ?
          AND lead_record.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.activityId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (state.status !== "SCHEDULED") {
      await connection.rollback();
      return { outcome: "INVALID_STATE", currentStatus: state.status };
    }

    if (input.changes.userId !== undefined) {
      const [userRows] = await connection.execute<IdRow[]>(
        `
          SELECT id
          FROM users
          WHERE id = ?
            AND tenant_id = ?
            AND status = 'ACTIVE'
            AND deleted_at IS NULL
          LIMIT 1
        `,
        [input.changes.userId, input.tenantId],
      );

      if (!userRows[0]) {
        await connection.rollback();
        return { outcome: "USER_NOT_FOUND" };
      }
    }

    const clauses: string[] = [];
    const values: Array<string | number | Date | null> = [];
    const addChange = (
      column: string,
      value: string | number | Date | null | undefined,
    ): void => {
      if (value !== undefined) {
        clauses.push(`${column} = ?`);
        values.push(value);
      }
    };

    addChange("user_id", input.changes.userId);
    addChange("subject", input.changes.subject);
    addChange("details", input.changes.details);
    addChange("scheduled_at", input.changes.scheduledAt);
    clauses.push("updated_at = CURRENT_TIMESTAMP(3)");

    await connection.execute<ResultSetHeader>(
      `
        UPDATE lead_activities
        SET ${clauses.join(", ")}
        WHERE id = ?
          AND tenant_id = ?
      `,
      [...values, input.activityId, input.tenantId],
    );

    if (state.activityType === "FOLLOW_UP") {
      await recalculateNextFollowUp(connection, input.tenantId, state.leadId);
    }

    const activity = await reloadActivity(
      connection,
      input.tenantId,
      input.activityId,
    );
    await connection.commit();

    return { outcome: "UPDATED", activity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLeadActivityStatus(
  input: UpdateLeadActivityStatusRepositoryInput,
): Promise<UpdateLeadActivityStatusRepositoryResult> {
  const allowedTransitions: Record<
    LeadActivityStatus,
    readonly LeadActivityStatus[]
  > = {
    SCHEDULED: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: ["SCHEDULED"],
  };
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [stateRows] = await connection.execute<ActivityStateRow[]>(
      `
        SELECT
          activity.lead_id AS leadId,
          activity.activity_type AS activityType,
          activity.status
        FROM lead_activities activity
        INNER JOIN leads lead_record
          ON lead_record.id = activity.lead_id
          AND lead_record.tenant_id = activity.tenant_id
        WHERE activity.id = ?
          AND activity.tenant_id = ?
          AND lead_record.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.activityId, input.tenantId],
    );
    const state = stateRows[0];

    if (!state) {
      await connection.rollback();
      return { outcome: "NOT_FOUND" };
    }

    if (!allowedTransitions[state.status].includes(input.status)) {
      await connection.rollback();
      return { outcome: "INVALID_TRANSITION", currentStatus: state.status };
    }

    await connection.execute<ResultSetHeader>(
      `
        UPDATE lead_activities
        SET status = ?,
            outcome = ?,
            scheduled_at = CASE
              WHEN ? = 'SCHEDULED' THEN ?
              ELSE scheduled_at
            END,
            completed_at = CASE
              WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP(3)
              ELSE NULL
            END,
            updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
          AND tenant_id = ?
      `,
      [
        input.status,
        input.outcome,
        input.status,
        input.scheduledAt,
        input.status,
        input.activityId,
        input.tenantId,
      ],
    );

    if (
      input.status === "COMPLETED" &&
      ["CALL", "EMAIL", "MEETING"].includes(state.activityType)
    ) {
      await connection.execute<ResultSetHeader>(
        `
          UPDATE leads
          SET last_contact_at = CURRENT_TIMESTAMP(3),
              updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
            AND tenant_id = ?
            AND deleted_at IS NULL
        `,
        [state.leadId, input.tenantId],
      );
    }

    if (state.activityType === "FOLLOW_UP") {
      await recalculateNextFollowUp(connection, input.tenantId, state.leadId);
    }

    const activity = await reloadActivity(
      connection,
      input.tenantId,
      input.activityId,
    );
    await connection.commit();

    return { outcome: "UPDATED", activity };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
