import { compare } from "bcryptjs";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  findActivePlatformUserById,
  findPlatformUserForLogin,
  revokePlatformRefreshToken,
  rotatePlatformRefreshToken,
  storePlatformRefreshToken,
  updatePlatformLastLogin,
} from "./platform.repository.js";
import {
  createPlatformAccessToken,
  generatePlatformRefreshToken,
  hashPlatformRefreshToken,
} from "./platform.tokens.js";

interface PlatformLoginInput {
  email: string;
  password: string;
}

export async function loginPlatformUser(
  input: PlatformLoginInput,
) {
  const email = input.email.trim().toLowerCase();
  const user = await findPlatformUserForLogin(email);

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

  const accessToken = createPlatformAccessToken(
    user.id,
    user.authVersion,
    user.role,
  );
  const refreshToken = generatePlatformRefreshToken();

  await storePlatformRefreshToken({
    userId: user.id,
    tokenHash: refreshToken.tokenHash,
    expiresAt: refreshToken.expiresAt,
  });
  await updatePlatformLastLogin(user.id);

  return {
    refreshToken: refreshToken.rawToken,
    accessToken,
    expiresInSeconds: env.auth.accessTokenSeconds,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshPlatformSession(
  currentRawToken: string,
) {
  const currentTokenHash =
    hashPlatformRefreshToken(currentRawToken);
  const newRefreshToken = generatePlatformRefreshToken();

  const session = await rotatePlatformRefreshToken(
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

  return {
    refreshToken: newRefreshToken.rawToken,
    accessToken: createPlatformAccessToken(
      session.userId,
      session.authVersion,
      session.role,
    ),
    expiresInSeconds: env.auth.accessTokenSeconds,
  };
}

export async function logoutPlatformSession(
  rawRefreshToken: string | undefined,
): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  await revokePlatformRefreshToken(
    hashPlatformRefreshToken(rawRefreshToken),
  );
}

export async function getCurrentPlatformUser(userId: number) {
  const user = await findActivePlatformUserById(userId);

  if (!user) {
    throw new AppError(
      401,
      "Platform account is no longer active",
    );
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}
