import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  findTenantUserForLogin,
  findUserAuthorization,
  storeRefreshToken,
  updateLastLogin,
  findActiveTenantUserById,
  rotateStoredRefreshToken,
  revokeStoredRefreshToken,
} from "./auth.repository.js";

import {
  createTenantAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./auth.tokens.js";

interface LoginInput {
  email: string;
  password: string;
}

export async function refreshTenantSession(
  currentRawToken: string,
) {
  const currentTokenHash = hashRefreshToken(currentRawToken);
  const newRefreshToken = generateRefreshToken();

  const session = await rotateStoredRefreshToken(
    currentTokenHash,
    {
      tokenHash: newRefreshToken.tokenHash,
      expiresAt: newRefreshToken.expiresAt,
    },
  );

  if (!session) {
    throw new AppError(
      401,
      "Invalid or expired refresh token",
    );
  }

  const authorization = await findUserAuthorization(
    session.tenantId,
    session.userId,
  );

  const accessToken = createTenantAccessToken(
    session.userId,
    session.tenantId,
    authorization,
  );

  return {
    refreshToken: newRefreshToken.rawToken,
    accessToken,
    expiresInSeconds: env.auth.accessTokenSeconds,
  };
}

export async function logoutTenantSession(
    rawRefreshToken: string | undefined,
): Promise<void> {
    if(!rawRefreshToken){
        return;
    }
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await revokeStoredRefreshToken(tokenHash);
}

export async function getCurrentTenantUser(tenantId:number, userId:number) {
    const user = await findActiveTenantUserById(tenantId, userId)
    if(!user){
        throw new AppError(401, "User Account is no longer active.")
    }

    const authorization = await findUserAuthorization(tenantId,userId);

    return {
        id: user.id,
        tenantId: user.tenantId,
        defaultLocationId: user.defaultLocationId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: authorization.roles,
        permissions: authorization.permissions,
    };
}

export async function loginTenantUser(input: LoginInput) {
  const email = input.email.trim().toLowerCase();

  const user = await findTenantUserForLogin(email);

  if (!user) {
    throw new AppError(401, "Invalid login credentials");
  }

  const passwordMatches = await compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(401, "Invalid login credentials");
  }

  const authorization = await findUserAuthorization(
    user.tenantId,
    user.id,
  );

  const accessToken = createTenantAccessToken(
    user.id,
    user.tenantId,
    authorization,
  );
  const refreshToken = generateRefreshToken();

  await storeRefreshToken({
    tenantId: user.tenantId,
    userId: user.id,
    tokenHash: refreshToken.tokenHash,
    expiresAt: refreshToken.expiresAt,
  });

  await updateLastLogin(user.id);

  return {
    refreshToken: refreshToken.rawToken,
    accessToken,
    expiresInSeconds: env.auth.accessTokenSeconds,

    user: {
      id: user.id,
      tenantId: user.tenantId,
      defaultLocationId: user.defaultLocationId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: authorization.roles,
      permissions: authorization.permissions,
    },
  };
}
