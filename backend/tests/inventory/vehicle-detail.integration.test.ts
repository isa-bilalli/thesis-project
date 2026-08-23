import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import app from "../../apps/inventory-service/app.js";
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

let server: Server;
let baseUrl: string;
let vehicleId: number;
let readToken: string;
let financialsToken: string;
let noPermissionToken: string;

async function get(path: string, token?: string): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
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
        AND l.deleted_at IS NULL
      LIMIT 1
    `,
  );
  const fixture = rows[0];

  if (!fixture) {
    throw new Error(
      "Inventory integration tests require one active tenant, user, and location",
    );
  }

  const [insertResult] = await database.execute<ResultSetHeader>(
    `
      INSERT INTO vehicles (
        tenant_id,
        location_id,
        stock_number,
        vehicle_condition,
        status,
        make,
        model,
        model_year,
        mileage_km,
        purchase_price,
        asking_price,
        minimum_price,
        created_by_user_id
      )
      VALUES (
        ?, ?, ?, 'USED', 'AVAILABLE', 'Integration', 'Test', 2024,
        1000, 19000.00, 24000.00, 21000.00, ?
      )
    `,
    [
      fixture.tenantId,
      fixture.locationId,
      `INTEGRATION-DETAIL-${Date.now()}`,
      fixture.userId,
    ],
  );
  vehicleId = insertResult.insertId;

  readToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["SALESPERSON"], permissions: ["inventory.read"] },
  );
  financialsToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    {
      roles: ["SALES_MANAGER"],
      permissions: ["inventory.read", "inventory.financials.read"],
    },
  );
  noPermissionToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["SALESPERSON"], permissions: [] },
  );

  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine the integration test server port");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }

  if (vehicleId) {
    await database.execute("DELETE FROM vehicles WHERE id = ?", [vehicleId]);
  }

  await database.end();
});

test("GET /api/tenant/vehicles/:vehicleId", async (context) => {
  await context.test("returns a vehicle under the vehicle key", async () => {
    const response = await get(
      `/api/tenant/vehicles/${vehicleId}`,
      readToken,
    );

    assert.equal(response.status, 200);
    assert.ok(response.body.vehicle);
    assert.equal("result" in response.body, false);
  });

  await context.test(
    "hides financial fields from an inventory reader",
    async () => {
      const response = await get(
        `/api/tenant/vehicles/${vehicleId}`,
        readToken,
      );
      const vehicle = response.body.vehicle as Record<string, unknown>;

      assert.equal(response.status, 200);
      assert.equal("purchasePrice" in vehicle, false);
      assert.equal("minimumPrice" in vehicle, false);
      assert.equal(vehicle.askingPrice, "24000.00");
    },
  );

  await context.test(
    "returns financial fields to an authorized reader",
    async () => {
      const response = await get(
        `/api/tenant/vehicles/${vehicleId}`,
        financialsToken,
      );
      const vehicle = response.body.vehicle as Record<string, unknown>;

      assert.equal(response.status, 200);
      assert.equal(vehicle.purchasePrice, "19000.00");
      assert.equal(vehicle.minimumPrice, "21000.00");
    },
  );

  await context.test("requires authentication", async () => {
    const response = await get(`/api/tenant/vehicles/${vehicleId}`);

    assert.equal(response.status, 401);
  });

  await context.test("requires inventory.read", async () => {
    const response = await get(
      `/api/tenant/vehicles/${vehicleId}`,
      noPermissionToken,
    );

    assert.equal(response.status, 403);
  });

  await context.test("rejects non-decimal vehicle IDs", async () => {
    const [scientific, hexadecimal] = await Promise.all([
      get("/api/tenant/vehicles/1e3", readToken),
      get("/api/tenant/vehicles/0x10", readToken),
    ]);

    assert.equal(scientific.status, 400);
    assert.equal(hexadecimal.status, 400);
  });

  await context.test("returns 404 for a missing vehicle", async () => {
    const response = await get(
      "/api/tenant/vehicles/4294967295",
      readToken,
    );

    assert.equal(response.status, 404);
  });
});
