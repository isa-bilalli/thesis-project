import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import type { RowDataPacket } from "mysql2";
import { createGatewayApp } from "../../apps/gateway/app.js";
import inventoryApp from "../../apps/inventory-service/app.js";
import { database } from "../../src/config/database.js";
import { createTenantAccessToken } from "../../src/modules/identity/auth/auth.tokens.js";

interface FixtureRow extends RowDataPacket {
  tenantId: number;
  userId: number;
  authVersion: number;
  locationId: number;
  customerId: number;
}

interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

let inventoryServer: Server | undefined;
let gatewayServer: Server | undefined;
let baseUrl = "";
let token = "";
let fixture: FixtureRow;
let vehicleId = 0;
const suffix = `${Date.now()}`;

async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
  };
}

before(async () => {
  const [rows] = await database.query<FixtureRow[]>(
    `SELECT
       tenant.id AS tenantId,
       user_record.id AS userId,
       user_record.auth_version AS authVersion,
       location.id AS locationId,
       customer.id AS customerId
     FROM tenants tenant
     INNER JOIN users user_record
       ON user_record.tenant_id = tenant.id
       AND user_record.status = 'ACTIVE'
       AND user_record.deleted_at IS NULL
     INNER JOIN locations location
       ON location.tenant_id = tenant.id
       AND location.status = 'ACTIVE'
       AND location.deleted_at IS NULL
     INNER JOIN customers customer
       ON customer.tenant_id = tenant.id
       AND customer.deleted_at IS NULL
     WHERE tenant.status = 'ACTIVE'
       AND tenant.deleted_at IS NULL
     LIMIT 1`,
  );
  const activeFixture = rows[0];

  if (!activeFixture) {
    throw new Error("Inventory boundary tests require an active fixture");
  }

  fixture = activeFixture;
  token = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    {
      roles: ["SALES_MANAGER"],
      permissions: [
        "inventory.read",
        "inventory.write",
        "inventory.reserve",
        "inventory.financials.read",
      ],
    },
  );

  inventoryServer = inventoryApp.listen(0);
  await new Promise<void>((resolve) =>
    inventoryServer?.once("listening", resolve),
  );
  const inventoryAddress = inventoryServer.address();

  if (!inventoryAddress || typeof inventoryAddress === "string") {
    throw new Error("Could not determine Inventory service test port");
  }

  const inventoryUrl = `http://127.0.0.1:${inventoryAddress.port}`;
  gatewayServer = createGatewayApp(
    inventoryUrl,
    inventoryUrl,
    inventoryUrl,
    inventoryUrl,
  ).listen(0);
  await new Promise<void>((resolve) => gatewayServer?.once("listening", resolve));
  const gatewayAddress = gatewayServer.address();

  if (!gatewayAddress || typeof gatewayAddress === "string") {
    throw new Error("Could not determine gateway test port");
  }

  baseUrl = `http://127.0.0.1:${gatewayAddress.port}`;
});

after(async () => {
  if (gatewayServer) {
    await new Promise<void>((resolve, reject) =>
      gatewayServer?.close((error) => (error ? reject(error) : resolve())),
    );
  }
  if (inventoryServer) {
    await new Promise<void>((resolve, reject) =>
      inventoryServer?.close((error) => (error ? reject(error) : resolve())),
    );
  }

  if (vehicleId) {
    await database.execute("DELETE FROM vehicle_reservations WHERE vehicle_id = ?", [
      vehicleId,
    ]);
    await database.execute("DELETE FROM vehicles WHERE id = ?", [vehicleId]);
  }

  await database.end();
});

test("all nine Inventory endpoints work through the gateway", async () => {
  const created = await request("POST", "/api/tenant/vehicles", {
    locationId: fixture.locationId,
    stockNumber: `BOUNDARY-${suffix}`,
    condition: "USED",
    make: "Boundary",
    model: "Inventory",
    modelYear: 2026,
    mileageKm: 10,
    purchasePrice: "18000.00",
    askingPrice: "24000.00",
    minimumPrice: "21000.00",
  });
  assert.equal(created.status, 201);
  vehicleId = (created.body.vehicle as Record<string, unknown>).id as number;

  const listed = await request(
    "GET",
    `/api/tenant/vehicles?search=BOUNDARY-${suffix}`,
  );
  assert.equal(listed.status, 200);
  assert.equal((listed.body.vehicles as unknown[]).length, 1);

  const detail = await request("GET", `/api/tenant/vehicles/${vehicleId}`);
  assert.equal(detail.status, 200);

  const updated = await request("PATCH", `/api/tenant/vehicles/${vehicleId}`, {
    description: "All Inventory routes boundary test",
  });
  assert.equal(updated.status, 200);

  const available = await request(
    "PATCH",
    `/api/tenant/vehicles/${vehicleId}/status`,
    { status: "AVAILABLE" },
  );
  assert.equal(available.status, 200);

  const reservationKey = `reserve-${suffix}`;
  const reservationBody = {
    customerId: fixture.customerId,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    agreedPrice: "23500.00",
  };
  const reserved = await request(
    "POST",
    `/api/tenant/vehicles/${vehicleId}/reservation`,
    reservationBody,
    { "idempotency-key": reservationKey },
  );
  assert.equal(reserved.status, 201);

  const replayedReservation = await request(
    "POST",
    `/api/tenant/vehicles/${vehicleId}/reservation`,
    reservationBody,
    { "idempotency-key": reservationKey },
  );
  assert.equal(replayedReservation.status, 201);
  assert.equal(
    (replayedReservation.body.reservation as Record<string, unknown>).id,
    (reserved.body.reservation as Record<string, unknown>).id,
  );

  const cancellationKey = `cancel-${suffix}`;
  const cancelled = await request(
    "DELETE",
    `/api/tenant/vehicles/${vehicleId}/reservation`,
    { cancellationReason: "Boundary test" },
    { "idempotency-key": cancellationKey },
  );
  assert.equal(cancelled.status, 200);

  const replayedCancellation = await request(
    "DELETE",
    `/api/tenant/vehicles/${vehicleId}/reservation`,
    { cancellationReason: "Boundary test" },
    { "idempotency-key": cancellationKey },
  );
  assert.equal(replayedCancellation.status, 200);
  assert.equal(
    (replayedCancellation.body.reservation as Record<string, unknown>).id,
    (cancelled.body.reservation as Record<string, unknown>).id,
  );

  const drafted = await request(
    "PATCH",
    `/api/tenant/vehicles/${vehicleId}/status`,
    { status: "DRAFT" },
  );
  assert.equal(drafted.status, 200);

  const deleted = await request("DELETE", `/api/tenant/vehicles/${vehicleId}`);
  assert.equal(deleted.status, 204);

  const restored = await request(
    "POST",
    `/api/tenant/vehicles/${vehicleId}/restore`,
  );
  assert.equal(restored.status, 200);
  assert.equal(
    (restored.body.vehicle as Record<string, unknown>).status,
    "DRAFT",
  );
});
