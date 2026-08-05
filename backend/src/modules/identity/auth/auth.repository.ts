import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../../config/database";

interface TenantUserRow extends RowDataPacket {
  id: number;
  tenantId: number;
  defaultLocationId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  authVersion: number;
}

interface AuthorizationRow extends RowDataPacket {
  roleCode: string;
  permissionCode: string | null;
}

export interface TenantAuthUser {
  id: number;
  tenantId: number;
  defaultLocationId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  authVersion: number;
}

export interface UserAuthorization {
  roles: string[];
  permissions: string[];
}

interface CurrentTenantUserRow extends RowDataPacket {
    id: number;
    tenantId: number;
    defaultLocationId: number | null;
    firstName: string;
    lastName: string;
    email: string;
}

interface UserPasswordHashRow extends RowDataPacket {
  passwordHash: string;
}

interface StoreRefreshTokenInput {
  tenantId: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}

interface RefreshSessionRow extends RowDataPacket {
  id: number;
  tenantId: number;
  userId: number;
  authVersion: number;
}

interface NewRefreshToken {
  tokenHash: string;
  expiresAt: Date;
}

export interface RotatedRefreshSession {
  tenantId: number;
  userId: number;
  authVersion: number;
}

export async function revokeStoredRefreshToken(
    tokenHash: string,
): Promise<void> {
    await database.execute(
        `   UPDATE refresh_tokens
            SET
            revoked_at = UTC_TIMESTAMP(3),
            revocation_reason = 'LOGOUT'
            WHERE token_hash = ?
            AND revoked_at IS NULL
        `,
        [tokenHash]
    );
}

export async function rotateStoredRefreshToken(
  currentTokenHash: string,
  newToken: NewRefreshToken,
): Promise<RotatedRefreshSession | null> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RefreshSessionRow[]>(
      `
        SELECT
          rt.id,
          rt.tenant_id AS tenantId,
          rt.user_id AS userId,
          u.auth_version AS authVersion
        FROM refresh_tokens rt
        INNER JOIN users u
          ON u.id = rt.user_id
          AND u.tenant_id = rt.tenant_id
        INNER JOIN tenants t
          ON t.id = rt.tenant_id
        WHERE rt.token_hash = ?
          AND rt.revoked_at IS NULL
          AND rt.expires_at > UTC_TIMESTAMP(3)
          AND u.status = 'ACTIVE'
          AND u.deleted_at IS NULL
          AND t.status = 'ACTIVE'
          AND t.deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `,
      [currentTokenHash],
    );

    const currentToken = rows[0];

    if (!currentToken) {
      await connection.rollback();
      return null;
    }

    const [insertResult] =
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO refresh_tokens (
            tenant_id,
            user_id,
            token_hash,
            expires_at
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          currentToken.tenantId,
          currentToken.userId,
          newToken.tokenHash,
          newToken.expiresAt,
        ],
      );

    await connection.execute(
      `
        UPDATE refresh_tokens
        SET
          revoked_at = UTC_TIMESTAMP(3),
          replaced_by_token_id = ?,
          revocation_reason = 'ROTATED'
        WHERE id = ?
      `,
      [
        insertResult.insertId,
        currentToken.id,
      ],
    );

    await connection.commit();

    return {
      tenantId: currentToken.tenantId,
      userId: currentToken.userId,
      authVersion: currentToken.authVersion,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function storeRefreshToken(
  input: StoreRefreshTokenInput,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO refresh_tokens (
        tenant_id,
        user_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      input.tenantId,
      input.userId,
      input.tokenHash,
      input.expiresAt,
    ],
  );
}

export async function findActiveTenantUserById(tenantId: number, userId: number):Promise<CurrentTenantUserRow | null>{
    const [rows] = await database.execute<CurrentTenantUserRow[]>(
        `
            SELECT
            u.id,
            u.tenant_id AS tenantId,
            u.default_location_id AS defaultLocationId,
            u.first_name AS firstName,
            u.last_name AS lastName,
            u.email
            FROM users u
            INNER JOIN tenants t
            ON t.id = u.tenant_id
            WHERE u.id = ?
            AND u.tenant_id = ?
            AND u.status = 'ACTIVE'
            AND u.deleted_at IS NULL
            AND t.status = 'ACTIVE'
            AND t.deleted_at IS NULL
            LIMIT 1
        `,[userId, tenantId]
    );
    return rows[0] ?? null;
}

export async function findTenantUserForLogin(
  email: string,
): Promise<TenantAuthUser | null> {
  const [rows] = await database.execute<TenantUserRow[]>(
    `
      SELECT
        u.id,
        u.tenant_id AS tenantId,
        u.default_location_id AS defaultLocationId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.email,
        u.password_hash AS passwordHash,
        u.auth_version AS authVersion
      FROM users u
      INNER JOIN tenants t
        ON t.id = u.tenant_id
      WHERE u.email = ?
        AND t.status = 'ACTIVE'
        AND t.deleted_at IS NULL
        AND u.status = 'ACTIVE'
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserAuthorization(
  tenantId: number,
  userId: number,
): Promise<UserAuthorization> {
  const [rows] = await database.execute<AuthorizationRow[]>(
    `
      SELECT DISTINCT
        r.code AS roleCode,
        p.code AS permissionCode
      FROM user_roles ur
      INNER JOIN roles r
        ON r.id = ur.role_id
        AND r.tenant_id = ur.tenant_id
      LEFT JOIN role_permissions rp
        ON rp.role_id = r.id
        AND rp.tenant_id = ur.tenant_id
      LEFT JOIN permissions p
        ON p.id = rp.permission_id
      WHERE ur.tenant_id = ?
        AND ur.user_id = ?
    `,
    [tenantId, userId],
  );

  return {
    roles: [...new Set(rows.map((row) => row.roleCode))],

    permissions: [
      ...new Set(
        rows
          .map((row) => row.permissionCode)
          .filter((code): code is string => code !== null),
      ),
    ],
  };
}

export async function updateLastLogin(userId: number): Promise<void> {
  await database.execute(
    `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?
    `,
    [userId],
  );
}

export async function findUserPasswordHash(
  tenantId: number,
  userId: number,
): Promise<string | null> {
  const [rows] = await database.execute<UserPasswordHashRow[]>(
    `
      SELECT u.password_hash AS passwordHash
      FROM users u
      INNER JOIN tenants t
        ON t.id = u.tenant_id
      WHERE u.tenant_id = ?
        AND u.id = ?
        AND u.status = 'ACTIVE'
        AND u.deleted_at IS NULL
        AND t.status = 'ACTIVE'
        AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [tenantId, userId],
  );
  return rows[0]?.passwordHash ?? null;
}

export async function updatePassword(
  tenantId: number,
  userId: number,
  currentPasswordHash: string,
  newPasswordHash: string,
): Promise<boolean> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [updateResult] =
      await connection.execute<ResultSetHeader>(
        `
          UPDATE users u
          INNER JOIN tenants t
            ON t.id = u.tenant_id
          SET
            u.password_hash = ?,
            u.auth_version = u.auth_version + 1
          WHERE u.tenant_id = ?
            AND u.id = ?
            AND u.password_hash = ?
            AND u.status = 'ACTIVE'
            AND u.deleted_at IS NULL
            AND t.status = 'ACTIVE'
            AND t.deleted_at IS NULL
        `,
        [
          newPasswordHash,
          tenantId,
          userId,
          currentPasswordHash,
        ],
      );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `
        UPDATE refresh_tokens
        SET
          revoked_at = UTC_TIMESTAMP(3),
          revocation_reason = 'PASSWORD_CHANGED'
        WHERE tenant_id = ?
          AND user_id = ?
          AND revoked_at IS NULL
      `,
      [tenantId, userId],
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
