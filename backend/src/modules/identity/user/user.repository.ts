import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../../config/database.js"

interface RoleUpdateTargetRow extends RowDataPacket {
  id: number;
  currentStatus: string;
  isDealershipAdmin: number;
}

interface TenantRoleRow extends RowDataPacket {
  id: number;
  code: TenantRoleCode;
}

interface ActiveAdminCountRow extends RowDataPacket {
  activeAdminCount: number;
}

interface UserListRow extends RowDataPacket {
  id: number;
  defaultLocationId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  roleCodes: string | null;
}

export interface UserListItem {
  id: number;
  defaultLocationId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: string[];
}

export type TenantRoleCode =
  | "DEALERSHIP_ADMIN"
  | "SALES_MANAGER"
  | "SALESPERSON";

export interface CreateUserRepositoryInput {
  tenantId: number;
  assignedByUserId: number;
  defaultLocationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  roleCode: TenantRoleCode;
}

export interface CreatedUser {
  id: number;
  tenantId: number;
  defaultLocationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: Date;
  roles: TenantRoleCode[];
}

export type CreateUserRepositoryResult =
  | {
      outcome: "CREATED";
      user: CreatedUser;
    }
  | {
      outcome: "ROLE_NOT_FOUND";
    }
  | {
      outcome: "LOCATION_NOT_FOUND";
    }
  | {
      outcome: "EMAIL_CONFLICT";
    };

interface IdRow extends RowDataPacket {
  id: number;
}

interface CreatedUserRow extends RowDataPacket {
  id: number;
  tenantId: number;
  defaultLocationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: Date;
}

interface RoleRow extends RowDataPacket {
  id: number;
  code: TenantRoleCode;
  name: string;
  description: string | null;
}

export type UserAccountStatus =
  | "ACTIVE"
  | "DISABLED";

export interface UpdateUserStatusRepositoryInput {
  tenantId: number;
  targetUserId: number;
  status: UserAccountStatus;
}

export interface ReplaceUserRolesRepositoryInput {
  tenantId: number;
  assignedByUserId: number;
  targetUserId: number;
  roleCodes: TenantRoleCode[];
}

export type ReplaceUserRolesRepositoryResult =
  | {
      outcome: "UPDATED";
      user: {
        id: number;
        roles: TenantRoleCode[];
      };
    }
  | {
      outcome: "USER_NOT_FOUND";
    }
  | {
      outcome: "ROLE_NOT_FOUND";
      missingRoles: TenantRoleCode[];
    }
  | {
      outcome: "LAST_ADMIN";
    };

export type UpdateUserStatusRepositoryResult =
  | {
      outcome: "UPDATED";
      user: {
        id: number;
        status: UserAccountStatus;
      };
    }
  | {
      outcome: "USER_NOT_FOUND";
    }
  | {
      outcome: "LAST_ADMIN";
    };

interface StatusTargetRow extends RowDataPacket {
  id: number;
  currentStatus: string;
  isDealershipAdmin: number;
}

interface CountRow extends RowDataPacket {
  activeAdminCount: number;
}

export interface AssignableRole {
  id: number;
  code: TenantRoleCode;
  name: string;
  description: string | null;
}

function isDuplicateEntry(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

export async function createUser(input: CreateUserRepositoryInput): Promise<CreateUserRepositoryResult> {
  const connection = await database.getConnection();
  try{
    connection.beginTransaction()

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
      [
        input.defaultLocationId,
        input.tenantId,
      ],
    );
    
    if(!locationRows[0]) {
      await connection.rollback()
      return {
        outcome: "LOCATION_NOT_FOUND"
      }
    }
  const [roleRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM roles
        WHERE tenant_id = ?
          AND code = ?
        LIMIT 1
      `,
      [
        input.tenantId,
        input.roleCode,
      ],
    );

    const role = roleRows[0];

    if (!role) {
      await connection.rollback();

      return {
        outcome: "ROLE_NOT_FOUND",
      };
    }

    const [insertResult] =
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO users (
            tenant_id,
            default_location_id,
            first_name,
            last_name,
            email,
            password_hash,
            phone,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          input.tenantId,
          input.defaultLocationId,
          input.firstName,
          input.lastName,
          input.email,
          input.passwordHash,
          input.phone,
        ],
      );

    const userId = insertResult.insertId;

    await connection.execute(
      `
        INSERT INTO user_roles (
          tenant_id,
          user_id,
          role_id,
          assigned_by_user_id
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        input.tenantId,
        userId,
        role.id,
        input.assignedByUserId,
      ],
    );

    const [userRows] =
      await connection.execute<CreatedUserRow[]>(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            default_location_id AS defaultLocationId,
            first_name AS firstName,
            last_name AS lastName,
            email,
            phone,
            status,
            created_at AS createdAt
          FROM users
          WHERE id = ?
            AND tenant_id = ?
          LIMIT 1
        `,
        [
          userId,
          input.tenantId,
        ],
      );

    const user = userRows[0];

    if (!user) {
      throw new Error(
        "Created user could not be retrieved",
      );
    }

    await connection.commit();

    return {
      outcome: "CREATED",
      user: {
        ...user,
        roles: [input.roleCode],
      },
    };
  } catch (error) {
    await connection.rollback();

    if (isDuplicateEntry(error)) {
      return {
        outcome: "EMAIL_CONFLICT",
      };
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function getAllUsers(
  tenantId: number,
): Promise<UserListItem[]> {
  const [rows] = await database.execute<UserListRow[]>(
    `
      SELECT
        u.id,
        u.default_location_id AS defaultLocationId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.email,
        u.phone,
        u.status,
        u.last_login_at AS lastLoginAt,
        u.created_at AS createdAt,
        GROUP_CONCAT(
          DISTINCT r.code
          ORDER BY r.code
          SEPARATOR ','
        ) AS roleCodes
      FROM users u
      LEFT JOIN user_roles ur
        ON ur.user_id = u.id
        AND ur.tenant_id = u.tenant_id
      LEFT JOIN roles r
        ON r.id = ur.role_id
        AND r.tenant_id = u.tenant_id
      WHERE u.tenant_id = ?
        AND u.deleted_at IS NULL
      GROUP BY
        u.id,
        u.default_location_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.last_login_at,
        u.created_at
      ORDER BY u.created_at DESC
    `,
    [tenantId],
  );

  const users = rows.map((row) => ({
    id: row.id,
    defaultLocationId: row.defaultLocationId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    roles: row.roleCodes
    ? row.roleCodes.split(",")
    : [],
  }));
  return users;
}

export async function getAssignableRoles(tenantId: number): Promise<AssignableRole[]> {
  const [rows] = await database.execute<RoleRow[]>(
    `
      SELECT
      id,
      code,
      name,
      description
      FROM roles
      WHERE tenant_id = ?
      ORDER BY name ASC
    `,[tenantId]
  );
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
  }));
}

export async function updateUserStatus(input: UpdateUserStatusRepositoryInput): Promise<UpdateUserStatusRepositoryResult> {
  const connection = await database.getConnection();
  try{
    await connection.beginTransaction()

    const [tenantRows] = await connection.execute<IdRow[]>(
      `SELECT id
      from tenants
      where id = ?
      AND status = 'ACTIVE'
      and deleted_at IS NULL
      limit 1
      for update
      `, [input.tenantId],
    );

    if(!tenantRows[0]){
      await connection.rollback();

      return {
        outcome: "USER_NOT_FOUND",
      };
    }

    const [targetRows] =
      await connection.execute<StatusTargetRow[]>(
        `
          SELECT
            u.id,
            u.status AS currentStatus,
            EXISTS (
              SELECT 1
              FROM user_roles ur
              INNER JOIN roles r
                ON r.id = ur.role_id
                AND r.tenant_id = ur.tenant_id
              WHERE ur.tenant_id = u.tenant_id
                AND ur.user_id = u.id
                AND r.code = 'DEALERSHIP_ADMIN'
            ) AS isDealershipAdmin
          FROM users u
          WHERE u.id = ?
            AND u.tenant_id = ?
            AND u.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.targetUserId,
          input.tenantId,
        ],
      );

    const targetUser = targetRows[0];

    if (!targetUser) {
      await connection.rollback();

      return {
        outcome: "USER_NOT_FOUND",
      };
    }

    const isDisablingActiveAdministrator =
      input.status === "DISABLED" &&
      targetUser.currentStatus === "ACTIVE" &&
      targetUser.isDealershipAdmin === 1;

    if (isDisablingActiveAdministrator) {
      const [countRows] =
        await connection.execute<CountRow[]>(
          `
            SELECT
              COUNT(DISTINCT u.id) AS activeAdminCount
            FROM users u
            INNER JOIN user_roles ur
              ON ur.user_id = u.id
              AND ur.tenant_id = u.tenant_id
            INNER JOIN roles r
              ON r.id = ur.role_id
              AND r.tenant_id = u.tenant_id
            WHERE u.tenant_id = ?
              AND u.status = 'ACTIVE'
              AND u.deleted_at IS NULL
              AND r.code = 'DEALERSHIP_ADMIN'
          `,
          [input.tenantId],
        );

      const activeAdminCount =
        countRows[0]?.activeAdminCount ?? 0;

      if (activeAdminCount <= 1) {
        await connection.rollback();

        return {
          outcome: "LAST_ADMIN",
        };
      }
    }

    await connection.execute(
      `
        UPDATE users
        SET status = ?
        WHERE id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `,
      [
        input.status,
        input.targetUserId,
        input.tenantId,
      ],
    );

    if (input.status === "DISABLED") {
      await connection.execute(
        `
          UPDATE refresh_tokens
          SET
            revoked_at = UTC_TIMESTAMP(3),
            revocation_reason = 'USER_DISABLED'
          WHERE tenant_id = ?
            AND user_id = ?
            AND revoked_at IS NULL
        `,
        [
          input.tenantId,
          input.targetUserId,
        ],
      );
    }

    await connection.commit();

    return {
      outcome: "UPDATED",
      user: {
        id: input.targetUserId,
        status: input.status,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function replaceUserRoles(input: ReplaceUserRolesRepositoryInput): Promise<ReplaceUserRolesRepositoryResult> {
   if (input.roleCodes.length === 0) {
    throw new Error(
      "replaceUserRoles requires at least one role",
    );
  }

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * This serializes status and role changes for the tenant,
     * protecting the final-administrator rule.
     */
    const [tenantRows] = await connection.execute<IdRow[]>(
      `
        SELECT id
        FROM tenants
        WHERE id = ?
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [input.tenantId],
    );

    if (!tenantRows[0]) {
      await connection.rollback();

      return {
        outcome: "USER_NOT_FOUND",
      };
    }

    const [targetRows] =
      await connection.execute<RoleUpdateTargetRow[]>(
        `
          SELECT
            u.id,
            u.status AS currentStatus,
            EXISTS (
              SELECT 1
              FROM user_roles ur
              INNER JOIN roles r
                ON r.id = ur.role_id
                AND r.tenant_id = ur.tenant_id
              WHERE ur.tenant_id = u.tenant_id
                AND ur.user_id = u.id
                AND r.code = 'DEALERSHIP_ADMIN'
            ) AS isDealershipAdmin
          FROM users u
          WHERE u.id = ?
            AND u.tenant_id = ?
            AND u.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
        [
          input.targetUserId,
          input.tenantId,
        ],
      );

    const targetUser = targetRows[0];

    if (!targetUser) {
      await connection.rollback();

      return {
        outcome: "USER_NOT_FOUND",
      };
    }

    const rolePlaceholders = input.roleCodes
      .map(() => "?")
      .join(", ");

    const [roleRows] =
      await connection.execute<TenantRoleRow[]>(
        `
          SELECT
            id,
            code
          FROM roles
          WHERE tenant_id = ?
            AND code IN (${rolePlaceholders})
          ORDER BY code ASC
        `,
        [
          input.tenantId,
          ...input.roleCodes,
        ],
      );

    const foundRoleCodes = new Set(
      roleRows.map((role) => role.code),
    );

    const missingRoles = input.roleCodes.filter(
      (roleCode) => !foundRoleCodes.has(roleCode),
    );

    if (missingRoles.length > 0) {
      await connection.rollback();

      return {
        outcome: "ROLE_NOT_FOUND",
        missingRoles,
      };
    }

    const isRemovingAdminRole =
      targetUser.currentStatus === "ACTIVE" &&
      targetUser.isDealershipAdmin === 1 &&
      !input.roleCodes.includes(
        "DEALERSHIP_ADMIN",
      );

    if (isRemovingAdminRole) {
      const [countRows] =
        await connection.execute<ActiveAdminCountRow[]>(
          `
            SELECT
              COUNT(DISTINCT u.id) AS activeAdminCount
            FROM users u
            INNER JOIN user_roles ur
              ON ur.user_id = u.id
              AND ur.tenant_id = u.tenant_id
            INNER JOIN roles r
              ON r.id = ur.role_id
              AND r.tenant_id = u.tenant_id
            WHERE u.tenant_id = ?
              AND u.status = 'ACTIVE'
              AND u.deleted_at IS NULL
              AND r.code = 'DEALERSHIP_ADMIN'
          `,
          [input.tenantId],
        );

      const activeAdminCount = Number(
        countRows[0]?.activeAdminCount ?? 0,
      );

      if (activeAdminCount <= 1) {
        await connection.rollback();

        return {
          outcome: "LAST_ADMIN",
        };
      }
    }

    await connection.execute(
      `
        DELETE FROM user_roles
        WHERE tenant_id = ?
          AND user_id = ?
      `,
      [
        input.tenantId,
        input.targetUserId,
      ],
    );

    for (const role of roleRows) {
      await connection.execute(
        `
          INSERT INTO user_roles (
            tenant_id,
            user_id,
            role_id,
            assigned_by_user_id
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          input.tenantId,
          input.targetUserId,
          role.id,
          input.assignedByUserId,
        ],
      );
    }

    /*
     * Role changes invalidate refresh sessions so that future
     * access tokens receive the new permissions.
     */
    await connection.execute(
      `
        UPDATE refresh_tokens
        SET
          revoked_at = UTC_TIMESTAMP(3),
          revocation_reason = 'ROLES_CHANGED'
        WHERE tenant_id = ?
          AND user_id = ?
          AND revoked_at IS NULL
      `,
      [
        input.tenantId,
        input.targetUserId,
      ],
    );

    await connection.commit();

    return {
      outcome: "UPDATED",
      user: {
        id: input.targetUserId,
        roles: roleRows.map((role) => role.code),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}