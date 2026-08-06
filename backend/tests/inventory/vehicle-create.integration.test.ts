import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import type { RowDataPacket } from "mysql2";
import app from "../../src/app.js";
import { database } from "../../src/config/database.js";
import { createTenantAccessToken } from "../../src/modules/identity/auth/auth.tokens.js";

interface FixtureRow extends RowDataPacket {
  tenantId: number;
  userId: number;
  authVersion: number;
  locationId: number;
}

interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

let server: Server | undefined;
let baseUrl = "";
let fixture: FixtureRow;
let writeToken = "";
let writeOnlyToken = "";
let readToken = "";
const createdVehicleIds: number[] = [];
const uniqueSuffix = `${Date.now()}`.slice(-10);

function validVehicleBody(
  stockNumber = `CREATE-${uniqueSuffix}`,
  vin: string | null = `CREATEVIN${uniqueSuffix}`,
): Record<string, unknown> {
  return {
    locationId: fixture.locationId,
    stockNumber,
    vin,
    condition: "used",
    make: "Integration",
    model: "Create Test",
    trimLevel: "Complete",
    modelYear: 2024,
    bodyType: "Sedan",
    fuelType: "Petrol",
    transmission: "Automatic",
    drivetrain: "FWD",
    engineDescription: "2.0 test engine",
    mileageKm: 1234,
    exteriorColor: "Black",
    interiorColor: "Black",
    registrationNumber: "test-123",
    firstRegistrationDate: "2024-01-15",
    acquiredAt: "2026-08-06T12:00:00.000Z",
    purchasePrice: "18000.00",
    askingPrice: 22000,
    minimumPrice: "20500.00",
    primaryImageUrl: null,
    description: "Create endpoint integration test",
  };
}

async function post(
  body: Record<string, unknown>,
  token?: string,
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}/api/tenant/vehicles`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

before(async () => {
  const [rows] = await database.query<FixtureRow[]>(
    `
      SELECT
        t.id AS tenantId,
        u.id AS userId,
        u.auth_version AS authVersion,
        l.id AS locationId
      FROM tenants t
      INNER JOIN users u
        ON u.tenant_id = t.id
      INNER JOIN locations l
        ON l.tenant_id = t.id
      WHERE t.status = 'ACTIVE'
        AND t.deleted_at IS NULL
        AND u.status = 'ACTIVE'
        AND u.deleted_at IS NULL
        AND l.status = 'ACTIVE'
        AND l.deleted_at IS NULL
      LIMIT 1
    `,
  );
  const activeFixture = rows[0];

  if (!activeFixture) {
    throw new Error(
      "Inventory integration tests require one active tenant, user, and location",
    );
  }

  fixture = activeFixture;
  writeToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    {
      roles: ["SALES_MANAGER"],
      permissions: ["inventory.write", "inventory.financials.read"],
    },
  );
  writeOnlyToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["CUSTOM_WRITER"], permissions: ["inventory.write"] },
  );
  readToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["SALESPERSON"], permissions: ["inventory.read"] },
  );

  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", resolve));

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine the integration test server port");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve())),
    );
  }

  for (const vehicleId of createdVehicleIds) {
    await database.execute("DELETE FROM vehicles WHERE id = ?", [vehicleId]);
  }

  await database.end();
});

test("POST /api/tenant/vehicles", async (context) => {
  await context.test("requires authentication", async () => {
    const response = await post(validVehicleBody());

    assert.equal(response.status, 401);
  });

  await context.test("requires inventory.write", async () => {
    const response = await post(validVehicleBody(), readToken);

    assert.equal(response.status, 403);
  });

  await context.test("rejects protected fields", async () => {
    const response = await post(
      { ...validVehicleBody(), status: "AVAILABLE" },
      writeToken,
    );

    assert.equal(response.status, 400);
  });

  await context.test("validates the price order", async () => {
    const response = await post(
      {
        ...validVehicleBody(),
        askingPrice: "20000.00",
        minimumPrice: "21000.00",
      },
      writeToken,
    );

    assert.equal(response.status, 400);
  });

  await context.test("rejects a location outside the tenant", async () => {
    const response = await post(
      { ...validVehicleBody(), locationId: 4294967295 },
      writeToken,
    );

    assert.equal(response.status, 404);
  });

  await context.test("creates a draft vehicle", async () => {
    const response = await post(validVehicleBody(), writeToken);
    const vehicle = response.body.vehicle as Record<string, unknown>;

    assert.equal(response.status, 201);
    assert.equal(vehicle.status, "DRAFT");
    assert.equal(vehicle.condition, "USED");
    assert.equal(vehicle.stockNumber, `CREATE-${uniqueSuffix}`);
    assert.equal(vehicle.vin, `CREATEVIN${uniqueSuffix}`);
    assert.equal(vehicle.purchasePrice, "18000.00");
    assert.equal(vehicle.minimumPrice, "20500.00");
    assert.equal(vehicle.registrationNumber, "TEST-123");

    createdVehicleIds.push(vehicle.id as number);
  });

  await context.test("returns a stock-number conflict", async () => {
    const response = await post(
      validVehicleBody(
        `CREATE-${uniqueSuffix}`,
        `OTHERINV${uniqueSuffix}`,
      ),
      writeToken,
    );

    assert.equal(response.status, 409);
  });

  await context.test("returns a VIN conflict", async () => {
    const response = await post(
      validVehicleBody(`OTHER-${uniqueSuffix}`),
      writeToken,
    );

    assert.equal(response.status, 409);
  });

  await context.test(
    "redacts financial fields without financial read access",
    async () => {
      const response = await post(
        validVehicleBody(`REDACT-${uniqueSuffix}`, null),
        writeOnlyToken,
      );
      const vehicle = response.body.vehicle as Record<string, unknown>;

      assert.equal(response.status, 201);
      assert.equal("purchasePrice" in vehicle, false);
      assert.equal("minimumPrice" in vehicle, false);
      assert.equal(vehicle.askingPrice, "22000.00");

      createdVehicleIds.push(vehicle.id as number);
    },
  );
});
