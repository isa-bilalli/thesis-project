import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { database } from "../../../config/database.js";

export type PlatformRole = "SYSTEM_ADMIN";

interface PlatformUserRow extends RowDataPacket {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
  authVersion: number;
}

interface CurrentPlatformUserRow extends RowDataPacket {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: PlatformRole;
}

interface PlatformRefreshSessionRow extends RowDataPacket {
  id: number;
  userId: number;
  authVersion: number;
  role: PlatformRole;
}

interface StorePlatformRefreshTokenInput {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}

interface NewPlatformRefreshToken {
  tokenHash: string;
  expiresAt: Date;
}

export interface PlatformAuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
  authVersion: number;
}

export interface RotatedPlatformSession {
  userId: number;
  authVersion: number;
  role: PlatformRole;
}

export async function findPlatformUserForLogin(
  email: string,
): Promise<PlatformAuthUser | null> {
  const [rows] = await database.execute<PlatformUserRow[]>(
    `
      SELECT
        pu.id,
        pu.first_name AS firstName,
        pu.last_name AS lastName,
        pu.email,
        pu.password_hash AS passwordHash,
        pu.role,
        pu.auth_version AS authVersion
      FROM platform_users pu
      WHERE pu.email = ?
        AND pu.role = 'SYSTEM_ADMIN'
        AND pu.status = 'ACTIVE'
        AND pu.deleted_at IS NULL
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

export async function findActivePlatformUserById(
  userId: number,
): Promise<CurrentPlatformUserRow | null> {
  const [rows] =
    await database.execute<CurrentPlatformUserRow[]>(
      `
        SELECT
          pu.id,
          pu.first_name AS firstName,
          pu.last_name AS lastName,
          pu.email,
          pu.role
        FROM platform_users pu
        WHERE pu.id = ?
          AND pu.role = 'SYSTEM_ADMIN'
          AND pu.status = 'ACTIVE'
          AND pu.deleted_at IS NULL
        LIMIT 1
      `,
      [userId],
    );

  return rows[0] ?? null;
}

export async function storePlatformRefreshToken(
  input: StorePlatformRefreshTokenInput,
): Promise<void> {
  await database.execute(
    `
      INSERT INTO platform_refresh_tokens (
        platform_user_id,
        token_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `,
    [input.userId, input.tokenHash, input.expiresAt],
  );
}

export async function rotatePlatformRefreshToken(
  currentTokenHash: string,
  newToken: NewPlatformRefreshToken,
): Promise<RotatedPlatformSession | null> {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] =
      await connection.execute<PlatformRefreshSessionRow[]>(
        `
          SELECT
            prt.id,
            prt.platform_user_id AS userId,
            pu.auth_version AS authVersion,
            pu.role
          FROM platform_refresh_tokens prt
          INNER JOIN platform_users pu
            ON pu.id = prt.platform_user_id
          WHERE prt.token_hash = ?
            AND prt.revoked_at IS NULL
            AND prt.expires_at > UTC_TIMESTAMP(3)
            AND pu.role = 'SYSTEM_ADMIN'
            AND pu.status = 'ACTIVE'
            AND pu.deleted_at IS NULL
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
          INSERT INTO platform_refresh_tokens (
            platform_user_id,
            token_hash,
            expires_at
          )
          VALUES (?, ?, ?)
        `,
        [
          currentToken.userId,
          newToken.tokenHash,
          newToken.expiresAt,
        ],
      );

    await connection.execute(
      `
        UPDATE platform_refresh_tokens
        SET
          revoked_at = UTC_TIMESTAMP(3),
          replaced_by_token_id = ?,
          revocation_reason = 'ROTATED'
        WHERE id = ?
      `,
      [insertResult.insertId, currentToken.id],
    );

    await connection.commit();

    return {
      userId: currentToken.userId,
      authVersion: currentToken.authVersion,
      role: currentToken.role,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function revokePlatformRefreshToken(
  tokenHash: string,
): Promise<void> {
  await database.execute(
    `
      UPDATE platform_refresh_tokens
      SET
        revoked_at = UTC_TIMESTAMP(3),
        revocation_reason = 'LOGOUT'
      WHERE token_hash = ?
        AND revoked_at IS NULL
    `,
    [tokenHash],
  );
}

export async function updatePlatformLastLogin(
  userId: number,
): Promise<void> {
  await database.execute(
    `
      UPDATE platform_users
      SET last_login_at = UTC_TIMESTAMP(3)
      WHERE id = ?
    `,
    [userId],
  );
}
