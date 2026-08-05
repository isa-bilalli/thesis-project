import {
  createHash,
  randomBytes,
} from "node:crypto";
import { sign } from "jsonwebtoken";
import { env } from "../../../config/env";

interface Authorization {
  roles: string[];
  permissions: string[];
}

export function createTenantAccessToken(
  userId: number,
  tenantId: number,
  authVersion: number,
  authorization: Authorization,
): string {
  return sign(
    {
      actorType: "TENANT",
      tenantId,
      authVersion,
      roles: authorization.roles,
      permissions: authorization.permissions,
    },
    env.auth.tenantAccessSecret,
    {
      subject: String(userId),
      expiresIn: env.auth.accessTokenSeconds,
    },
  );
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function generateRefreshToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = randomBytes(48).toString("base64url");

  const expiresAt = new Date(
    Date.now() +
      env.auth.refreshTokenDays * 24 * 60 * 60 * 1000,
  );

  return {
    rawToken,
    tokenHash: hashRefreshToken(rawToken),
    expiresAt,
  };
}
