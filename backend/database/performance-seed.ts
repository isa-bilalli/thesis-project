import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "bcryptjs";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { database } from "../src/config/database.js";
import { env } from "../src/config/env.js";

interface IdRow extends RowDataPacket {
  id: number;
}

interface ScaleDefinition {
  vehicles: number;
  customers: number;
  leads: number;
  activities: number;
  testDrives: number;
  offers: number;
  reservations: number;
  sales: number;
}

const scales: Record<string, ScaleDefinition> = {
  small: {
    vehicles: 500,
    customers: 1_000,
    leads: 1_500,
    activities: 3_000,
    testDrives: 400,
    offers: 500,
    reservations: 150,
    sales: 200,
  },
  medium: {
    vehicles: 5_000,
    customers: 10_000,
    leads: 15_000,
    activities: 30_000,
    testDrives: 4_000,
    offers: 5_000,
    reservations: 1_500,
    sales: 2_000,
  },
  large: {
    vehicles: 25_000,
    customers: 50_000,
    leads: 75_000,
    activities: 150_000,
    testDrives: 20_000,
    offers: 25_000,
    reservations: 7_500,
    sales: 10_000,
  },
};

const domainTables = [
  "sales",
  "vehicle_reservations",
  "offers",
  "test_drives",
  "lead_activities",
  "lead_vehicles",
  "leads",
  "customers",
  "vehicles",
] as const;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertSafeDatabaseName(): void {
  if (!/(perf|performance|benchmark|test)/i.test(env.database.name)) {
    throw new Error(
      `Refusing to clear database ${env.database.name}. Performance database names must contain perf, performance, benchmark, or test.`,
    );
  }
}

async function insertRows(
  connection: PoolConnection,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 500,
): Promise<void> {
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const placeholder = `(${columns.map(() => "?").join(",")})`;
    const placeholders = batch.map(() => placeholder).join(",");
    await connection.query(
      `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(",")}) VALUES ${placeholders}`,
      batch.flat(),
    );
  }
}

async function idsFor(
  connection: PoolConnection,
  table: string,
): Promise<number[]> {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM \`${table}\` ORDER BY id`,
  );
  return rows.map((row) => row.id);
}

function padded(value: number): string {
  return String(value).padStart(7, "0");
}

async function main(): Promise<void> {
  assertSafeDatabaseName();
  const scaleName = (process.env.PERF_SCALE ?? "small").toLowerCase();
  const scale = scales[scaleName];
  if (!scale) {
    throw new Error(`Unknown PERF_SCALE ${scaleName}. Use small, medium, or large.`);
  }

  const startedAt = new Date();
  const connection = await database.getConnection();

  try {
    const [tenantRows] = await connection.query<IdRow[]>(
      "SELECT id FROM tenants WHERE slug = 'demo-motors' LIMIT 1",
    );
    const tenantId = tenantRows[0]?.id;
    if (!tenantId) throw new Error("Run migrations and the normal seed first.");

    const [locationRows] = await connection.query<IdRow[]>(
      "SELECT id FROM locations WHERE tenant_id = ? AND code = 'MAIN' LIMIT 1",
      [tenantId],
    );
    const locationId = locationRows[0]?.id;

    const tenantAdminEmail = requiredEnvironment(
      "SEED_TENANT_ADMIN_EMAIL",
    ).toLowerCase();
    const [adminRows] = await connection.query<IdRow[]>(
      "SELECT id FROM users WHERE tenant_id = ? AND email = ? LIMIT 1",
      [tenantId, tenantAdminEmail],
    );
    const adminUserId = adminRows[0]?.id;
    if (!locationId || !adminUserId) {
      throw new Error("Seeded location or tenant administrator is missing.");
    }

    const salespersonEmail = "perf.salesperson@demo-motors.test";
    const salespersonPasswordHash = await hash(
      requiredEnvironment("SEED_TENANT_ADMIN_PASSWORD"),
      12,
    );
    await connection.execute(
      `
        INSERT INTO users (
          tenant_id, default_location_id, first_name, last_name,
          email, password_hash, status
        ) VALUES (?, ?, 'Performance', 'Salesperson', ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE
          default_location_id = VALUES(default_location_id),
          password_hash = VALUES(password_hash),
          auth_version = auth_version + 1,
          status = 'ACTIVE', deleted_at = NULL
      `,
      [tenantId, locationId, salespersonEmail, salespersonPasswordHash],
    );
    const [salespersonRows] = await connection.query<IdRow[]>(
      "SELECT id FROM users WHERE tenant_id = ? AND email = ? LIMIT 1",
      [tenantId, salespersonEmail],
    );
    const salespersonUserId = salespersonRows[0]?.id;
    const [salespersonRoleRows] = await connection.query<IdRow[]>(
      "SELECT id FROM roles WHERE tenant_id = ? AND code = 'SALESPERSON' LIMIT 1",
      [tenantId],
    );
    if (!salespersonUserId || !salespersonRoleRows[0]?.id) {
      throw new Error("Performance salesperson or role could not be created.");
    }
    await connection.execute(
      `
        INSERT INTO user_roles (tenant_id, user_id, role_id, assigned_by_user_id)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE assigned_by_user_id = VALUES(assigned_by_user_id)
      `,
      [tenantId, salespersonUserId, salespersonRoleRows[0].id, adminUserId],
    );

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of domainTables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    const saleCount = Math.min(scale.sales, scale.vehicles);
    const reservationCount = Math.min(
      scale.reservations,
      scale.vehicles - saleCount,
    );

    const vehicleRows = Array.from({ length: scale.vehicles }, (_, index) => {
      const status =
        index < saleCount
          ? "SOLD"
          : index < saleCount + reservationCount
            ? "RESERVED"
            : "AVAILABLE";
      const sequence = padded(index + 1);
      return [
        tenantId,
        locationId,
        `PERF-${sequence}`,
        `PERFVIN${String(index + 1).padStart(10, "0")}`,
        index % 4 === 0 ? "NEW" : "USED",
        status,
        index % 10 === 0 ? "Performance Motors" : `Make ${index % 40}`,
        `Model ${index % 120}`,
        2015 + (index % 12),
        index % 3 === 0 ? "SUV" : "SEDAN",
        index % 4 === 0 ? "ELECTRIC" : "PETROL",
        index % 2 === 0 ? "AUTOMATIC" : "MANUAL",
        index % 4 === 0 ? 0 : index * 37,
        18_000 + (index % 30_000),
        22_000 + (index % 35_000),
        20_000 + (index % 32_000),
        adminUserId,
      ];
    });
    await insertRows(
      connection,
      "vehicles",
      [
        "tenant_id",
        "location_id",
        "stock_number",
        "vin",
        "vehicle_condition",
        "status",
        "make",
        "model",
        "model_year",
        "body_type",
        "fuel_type",
        "transmission",
        "mileage_km",
        "purchase_price",
        "asking_price",
        "minimum_price",
        "created_by_user_id",
      ],
      vehicleRows,
    );
    const vehicleIds = await idsFor(connection, "vehicles");

    const customerRows = Array.from(
      { length: scale.customers },
      (_, index) => {
        const sequence = padded(index + 1);
        return [
          tenantId,
          "INDIVIDUAL",
          index % 10 === 0 ? "Performance" : `Customer${sequence}`,
          `Benchmark${index % 500}`,
          `perf.customer.${sequence}@example.test`,
          `+3606${String(index + 1).padStart(8, "0")}`,
          `City ${index % 100}`,
          "HU",
          index % 8 === 0 ? "CUSTOMER" : "PROSPECT",
          salespersonUserId,
          "Synthetic performance-test customer",
          adminUserId,
        ];
      },
    );
    await insertRows(
      connection,
      "customers",
      [
        "tenant_id",
        "customer_type",
        "first_name",
        "last_name",
        "email",
        "phone",
        "city",
        "country_code",
        "status",
        "assigned_to_user_id",
        "notes",
        "created_by_user_id",
      ],
      customerRows,
    );
    const customerIds = await idsFor(connection, "customers");

    const leadRows = Array.from({ length: scale.leads }, (_, index) => [
      tenantId,
      locationId,
      customerIds[index % customerIds.length],
      salespersonUserId,
      ["WALK_IN", "WEBSITE", "PHONE", "EMAIL", "REFERRAL"][index % 5],
      ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"][index % 5],
      ["LOW", "NORMAL", "HIGH"][index % 3],
      15_000 + (index % 8_000),
      30_000 + (index % 20_000),
      new Date(Date.now() + ((index % 30) + 1) * 86_400_000),
      "Synthetic benchmark lead",
      adminUserId,
    ]);
    await insertRows(
      connection,
      "leads",
      [
        "tenant_id",
        "location_id",
        "customer_id",
        "assigned_to_user_id",
        "source",
        "status",
        "priority",
        "budget_min",
        "budget_max",
        "next_follow_up_at",
        "notes",
        "created_by_user_id",
      ],
      leadRows,
    );
    const leadIds = await idsFor(connection, "leads");

    const interestCount = Math.min(leadIds.length, vehicleIds.length);
    await insertRows(
      connection,
      "lead_vehicles",
      ["tenant_id", "lead_id", "vehicle_id", "is_primary", "interest_notes"],
      Array.from({ length: interestCount }, (_, index) => [
        tenantId,
        leadIds[index],
        vehicleIds[index],
        true,
        "Primary synthetic interest",
      ]),
    );

    await insertRows(
      connection,
      "lead_activities",
      [
        "tenant_id",
        "lead_id",
        "user_id",
        "activity_type",
        "status",
        "subject",
        "details",
        "outcome",
        "completed_at",
      ],
      Array.from({ length: scale.activities }, (_, index) => [
        tenantId,
        leadIds[index % leadIds.length],
        salespersonUserId,
        ["NOTE", "CALL", "EMAIL", "MEETING"][index % 4],
        "COMPLETED",
        `Performance activity ${index + 1}`,
        "Synthetic benchmark activity details",
        "Benchmark outcome",
        new Date(Date.now() - (index % 90) * 86_400_000),
      ]),
    );

    const availableStart = saleCount + reservationCount;
    const availableCount = Math.max(1, vehicleIds.length - availableStart);
    await insertRows(
      connection,
      "test_drives",
      [
        "tenant_id",
        "location_id",
        "lead_id",
        "customer_id",
        "vehicle_id",
        "salesperson_user_id",
        "scheduled_start",
        "scheduled_end",
        "status",
        "notes",
        "created_by_user_id",
      ],
      Array.from({ length: scale.testDrives }, (_, index) => {
        const start = new Date(Date.now() + ((index % 30) + 1) * 3_600_000);
        return [
          tenantId,
          locationId,
          leadIds[index % leadIds.length],
          customerIds[index % customerIds.length],
          vehicleIds[availableStart + (index % availableCount)],
          salespersonUserId,
          start,
          new Date(start.getTime() + 3_600_000),
          index % 5 === 0 ? "COMPLETED" : "SCHEDULED",
          "Synthetic performance test drive",
          adminUserId,
        ];
      }),
    );

    await insertRows(
      connection,
      "offers",
      [
        "tenant_id",
        "location_id",
        "offer_number",
        "lead_id",
        "customer_id",
        "vehicle_id",
        "salesperson_user_id",
        "vehicle_price",
        "discount_amount",
        "tax_amount",
        "fee_amount",
        "status",
        "valid_until",
        "notes",
      ],
      Array.from({ length: scale.offers }, (_, index) => [
        tenantId,
        locationId,
        `PERF-O-${padded(index + 1)}`,
        leadIds[index % leadIds.length],
        customerIds[index % customerIds.length],
        vehicleIds[availableStart + (index % availableCount)],
        salespersonUserId,
        25_000 + (index % 20_000),
        index % 1_000,
        5_000,
        250,
        ["DRAFT", "SENT", "ACCEPTED", "REJECTED"][index % 4],
        new Date(Date.now() + 30 * 86_400_000),
        "Synthetic benchmark offer",
      ]),
    );

    await insertRows(
      connection,
      "vehicle_reservations",
      [
        "tenant_id",
        "reservation_number",
        "vehicle_id",
        "customer_id",
        "lead_id",
        "salesperson_user_id",
        "agreed_price",
        "status",
        "reserved_at",
        "expires_at",
        "notes",
        "created_by_user_id",
      ],
      Array.from({ length: reservationCount }, (_, index) => {
        const reservedAt = new Date(Date.now() - (index % 12) * 3_600_000);
        return [
          tenantId,
          `PERF-R-${padded(index + 1)}`,
          vehicleIds[saleCount + index],
          customerIds[index % customerIds.length],
          leadIds[index % leadIds.length],
          salespersonUserId,
          24_000 + (index % 15_000),
          "ACTIVE",
          reservedAt,
          new Date(reservedAt.getTime() + 14 * 86_400_000),
          "Synthetic benchmark reservation",
          adminUserId,
        ];
      }),
    );

    await insertRows(
      connection,
      "sales",
      [
        "tenant_id",
        "location_id",
        "sale_number",
        "customer_id",
        "vehicle_id",
        "salesperson_user_id",
        "lead_id",
        "sale_date",
        "vehicle_price",
        "discount_amount",
        "tax_amount",
        "fee_amount",
        "vehicle_cost_snapshot",
        "payment_method",
        "status",
        "completed_at",
        "notes",
        "created_by_user_id",
      ],
      Array.from({ length: saleCount }, (_, index) => {
        const saleDate = new Date(Date.now() - (index % 28) * 86_400_000);
        return [
          tenantId,
          locationId,
          `PERF-S-${padded(index + 1)}`,
          customerIds[index % customerIds.length],
          vehicleIds[index],
          salespersonUserId,
          leadIds[index % leadIds.length],
          saleDate,
          26_000 + (index % 20_000),
          index % 1_500,
          5_000,
          300,
          20_000 + (index % 10_000),
          ["CASH", "BANK_TRANSFER", "EXTERNAL_FINANCING"][index % 3],
          "COMPLETED",
          saleDate,
          "Synthetic benchmark sale",
          adminUserId,
        ];
      }),
    );

    const finishedAt = new Date();
    const summary = {
      database: env.database.name,
      scale: scaleName,
      configured: scale,
      actual: {
        ...scale,
        reservations: reservationCount,
        sales: saleCount,
        leadVehicleInterests: interestCount,
      },
      tenantId,
      locationId,
      adminUserId,
      salespersonUserId,
      salespersonEmail,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSeconds: (finishedAt.getTime() - startedAt.getTime()) / 1_000,
    };

    const outputPath = path.resolve(
      process.env.PERF_SEED_OUTPUT ??
        `../testing/results/datasets/${scaleName}.json`,
    );
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    connection.release();
    await database.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
