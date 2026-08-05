import {
  createHash,
  randomBytes,
} from "node:crypto";
import { sign } from "jsonwebtoken";
import { env } from "../../../config/env.js";

export function createPlatformAccessToken(
  userId: number,
  authVersion: number,
  role: "SYSTEM_ADMIN",
): string {
  return sign(
    {
      actorType: "PLATFORM",
      authVersion,
      role,
    },
    env.auth.platformAccessSecret,
    {
      subject: String(userId),
      expiresIn: env.auth.accessTokenSeconds,
    },
  );
}

export function hashPlatformRefreshToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function generatePlatformRefreshToken(): {
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
    tokenHash: hashPlatformRefreshToken(rawToken),
    expiresAt,
  };
}
