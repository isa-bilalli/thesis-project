import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),

  database: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    name: required("DB_NAME"),
  },

  auth: {
    tenantAccessSecret: required("JWT_TENANT_ACCESS_SECRET"),
    platformAccessSecret: required("JWT_PLATFORM_ACCESS_SECRET"),

    accessTokenSeconds: positiveInteger(
      "JWT_ACCESS_TOKEN_SECONDS",
      900,
    ),

    refreshTokenDays: positiveInteger(
      "REFRESH_TOKEN_DAYS",
      7,
    ),
  },

  isProduction: process.env.NODE_ENV === "production",
};
