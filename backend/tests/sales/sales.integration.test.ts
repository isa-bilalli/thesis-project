import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import app from "../../src/app.js";
import { database } from "../../src/config/database.js";
import { createTenantAccessToken } from "../../src/modules/identity/auth/auth.tokens.js";

interface FixtureRow extends RowDataPacket {
  tenantId: number;
  userId: number;
  authVersion: number;
  locationId: number;
}

interface StateRow extends RowDataPacket {
  vehicleStatus: string;
  reservationStatus: string;
  leadStatus: string;
  customerStatus: string;
}

interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

let server: Server | undefined;
let baseUrl = "";
let fixture: FixtureRow;
let customerId = 0;
let leadId = 0;
const vehicleIds: number[] = [];
const offerIds: number[] = [];
const reservationIds: number[] = [];
const saleIds: number[] = [];
let readToken = "";
let offerToken = "";
let managerToken = "";
const suffix = `${Date.now()}`.slice(-10);

async function request(
  method: string,
  path: string,
  token?: string,
  body?: Record<string, unknown>,
): Promise<ApiResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await response.text();

  return {
    status: response.status,
    body: responseText
      ? (JSON.parse(responseText) as Record<string, unknown>)
      : {},
  };
}

before(async () => {
  const [rows] = await database.query<FixtureRow[]>(
    `
      SELECT
        tenant.id AS tenantId,
        user_record.id AS userId,
        user_record.auth_version AS authVersion,
        location_record.id AS locationId
      FROM tenants tenant
      INNER JOIN users user_record
        ON user_record.tenant_id = tenant.id
      INNER JOIN locations location_record
        ON location_record.tenant_id = tenant.id
      WHERE tenant.status = 'ACTIVE'
        AND tenant.deleted_at IS NULL
        AND user_record.status = 'ACTIVE'
        AND user_record.deleted_at IS NULL
        AND location_record.status = 'ACTIVE'
        AND location_record.deleted_at IS NULL
      LIMIT 1
    `,
  );
  const activeFixture = rows[0];

  if (!activeFixture) {
    throw new Error("Sales integration tests require an active tenant fixture");
  }

  fixture = activeFixture;
  const [customerResult] = await database.execute<ResultSetHeader>(
    `
      INSERT INTO customers (
        tenant_id,
        customer_type,
        first_name,
        last_name,
        phone,
        status,
        created_by_user_id
      )
      VALUES (?, 'INDIVIDUAL', 'Sales', 'Integration', ?, 'PROSPECT', ?)
    `,
    [fixture.tenantId, `+382${suffix}`, fixture.userId],
  );
  customerId = customerResult.insertId;

  const [leadResult] = await database.execute<ResultSetHeader>(
    `
      INSERT INTO leads (
        tenant_id,
        location_id,
        customer_id,
        assigned_to_user_id,
        source,
        status,
        priority,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, 'WALK_IN', 'QUALIFIED', 'HIGH', ?)
    `,
    [
      fixture.tenantId,
      fixture.locationId,
      customerId,
      fixture.userId,
      fixture.userId,
    ],
  );
  leadId = leadResult.insertId;

  for (const index of [1, 2]) {
    const [vehicleResult] = await database.execute<ResultSetHeader>(
      `
        INSERT INTO vehicles (
          tenant_id,
          location_id,
          stock_number,
          vin,
          vehicle_condition,
          status,
          make,
          model,
          model_year,
          mileage_km,
          purchase_price,
          asking_price,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, 'USED', 'AVAILABLE', 'Sales', ?, 2025, 500, 18000, 25000, ?)
      `,
      [
        fixture.tenantId,
        fixture.locationId,
        `SALE-${suffix}-${index}`,
        `SALETEST${suffix}${index}`,
        `Vehicle ${index}`,
        fixture.userId,
      ],
    );
    vehicleIds.push(vehicleResult.insertId);
  }

  readToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["SALESPERSON"], permissions: ["sales.read"] },
  );
  offerToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    {
      roles: ["SALESPERSON"],
      permissions: ["sales.read", "sales.create_offer", "inventory.reserve"],
    },
  );
  managerToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    {
      roles: ["SALES_MANAGER"],
      permissions: [
        "sales.read",
        "sales.create_offer",
        "sales.complete",
        "inventory.reserve",
        "inventory.financials.read",
      ],
    },
  );

  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine Sales test server port");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve())),
    );
  }

  if (saleIds.length > 0) {
    await database.execute(
      `DELETE FROM sales WHERE id IN (${saleIds.map(() => "?").join(", ")})`,
      saleIds,
    );
  }
  if (reservationIds.length > 0) {
    await database.execute(
      `DELETE FROM vehicle_reservations WHERE id IN (${reservationIds.map(() => "?").join(", ")})`,
      reservationIds,
    );
  }
  if (offerIds.length > 0) {
    await database.execute(
      `DELETE FROM offers WHERE id IN (${offerIds.map(() => "?").join(", ")})`,
      offerIds,
    );
  }
  if (leadId) {
    await database.execute("DELETE FROM leads WHERE id = ?", [leadId]);
  }
  if (customerId) {
    await database.execute("DELETE FROM customers WHERE id = ?", [customerId]);
  }
  for (const vehicleId of vehicleIds) {
    await database.execute("DELETE FROM vehicles WHERE id = ?", [vehicleId]);
  }

  await database.end();
});

test("Sales endpoints", async (context) => {
  await context.test("enforces authentication and Sales permissions", async () => {
    const unauthenticated = await request("GET", "/api/tenant/offers");
    const offerForbidden = await request(
      "POST",
      "/api/tenant/offers",
      readToken,
      {},
    );
    const saleForbidden = await request(
      "POST",
      "/api/tenant/sales",
      offerToken,
      {},
    );

    assert.equal(unauthenticated.status, 401);
    assert.equal(offerForbidden.status, 403);
    assert.equal(saleForbidden.status, 403);
  });

  await context.test("creates, edits, sends, and accepts an offer", async () => {
    const created = await request(
      "POST",
      "/api/tenant/offers",
      offerToken,
      {
        locationId: fixture.locationId,
        leadId,
        customerId,
        vehicleId: vehicleIds[0],
        vehiclePrice: 25000,
        discountAmount: 500,
        taxAmount: 1000,
        feeAmount: 250,
        validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        notes: "Initial offer",
      },
    );
    assert.equal(created.status, 201);
    const offer = created.body.offer as Record<string, unknown>;
    const offerId = offer.id as number;
    offerIds.push(offerId);
    assert.equal(offer.status, "DRAFT");
    assert.equal(offer.totalAmount, "25750.00");

    const updated = await request(
      "PATCH",
      `/api/tenant/offers/${offerId}`,
      offerToken,
      { discountAmount: 750, notes: "Approved discount" },
    );
    assert.equal(updated.status, 200);
    assert.equal(
      (updated.body.offer as Record<string, unknown>).totalAmount,
      "25500.00",
    );

    const sent = await request(
      "PATCH",
      `/api/tenant/offers/${offerId}/status`,
      offerToken,
      { status: "SENT" },
    );
    assert.equal(sent.status, 200);
    assert.ok((sent.body.offer as Record<string, unknown>).sentAt);

    const accepted = await request(
      "PATCH",
      `/api/tenant/offers/${offerId}/status`,
      offerToken,
      { status: "ACCEPTED" },
    );
    assert.equal(accepted.status, 200);
    assert.ok((accepted.body.offer as Record<string, unknown>).respondedAt);

    const immutable = await request(
      "PATCH",
      `/api/tenant/offers/${offerId}`,
      offerToken,
      { notes: "Too late" },
    );
    assert.equal(immutable.status, 409);

    const listed = await request(
      "GET",
      `/api/tenant/offers?status=ACCEPTED&customerId=${customerId}`,
      readToken,
    );
    assert.equal(listed.status, 200);
    assert.equal((listed.body.offers as unknown[]).length, 1);
  });

  await context.test("reads and updates the linked reservation", async () => {
    const created = await request(
      "POST",
      `/api/tenant/vehicles/${vehicleIds[0]}/reservation`,
      offerToken,
      {
        customerId,
        leadId,
        offerId: offerIds[0],
        agreedPrice: 25500,
        expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        notes: "Deposit received",
      },
    );
    assert.equal(created.status, 201);
    const reservation = created.body.reservation as Record<string, unknown>;
    const reservationId = reservation.id as number;
    reservationIds.push(reservationId);

    const listed = await request(
      "GET",
      `/api/tenant/reservations?status=ACTIVE&customerId=${customerId}`,
      readToken,
    );
    assert.equal(listed.status, 200);
    assert.equal((listed.body.reservations as unknown[]).length, 1);

    const detail = await request(
      "GET",
      `/api/tenant/reservations/${reservationId}`,
      readToken,
    );
    assert.equal(detail.status, 200);
    assert.equal(
      ((detail.body.reservation as Record<string, unknown>).offer as Record<
        string,
        unknown
      >).id,
      offerIds[0],
    );

    const updated = await request(
      "PATCH",
      `/api/tenant/reservations/${reservationId}`,
      offerToken,
      {
        agreedPrice: 25400,
        expiresAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
        notes: "Extended reservation",
      },
    );
    assert.equal(updated.status, 200);
    assert.equal(
      (updated.body.reservation as Record<string, unknown>).agreedPrice,
      "25400.00",
    );
  });

  await context.test("creates, edits, and atomically completes a sale", async () => {
    const created = await request(
      "POST",
      "/api/tenant/sales",
      managerToken,
      {
        locationId: fixture.locationId,
        customerId,
        vehicleId: vehicleIds[0],
        leadId,
        offerId: offerIds[0],
        reservationId: reservationIds[0],
        saleDate: new Date().toISOString(),
        vehiclePrice: 25000,
        discountAmount: 750,
        taxAmount: 1000,
        feeAmount: 250,
        paymentMethod: "BANK_TRANSFER",
        notes: "Pending paperwork",
      },
    );
    assert.equal(created.status, 201);
    const sale = created.body.sale as Record<string, unknown>;
    const saleId = sale.id as number;
    saleIds.push(saleId);
    assert.equal(sale.status, "PENDING");
    assert.equal(sale.vehicleCostSnapshot, "18000.00");

    const readDetail = await request(
      "GET",
      `/api/tenant/sales/${saleId}`,
      readToken,
    );
    assert.equal(readDetail.status, 200);
    assert.equal(
      "vehicleCostSnapshot" in
        (readDetail.body.sale as Record<string, unknown>),
      false,
    );

    const updated = await request(
      "PATCH",
      `/api/tenant/sales/${saleId}`,
      managerToken,
      { feeAmount: 300, notes: "Ready to complete" },
    );
    assert.equal(updated.status, 200);
    assert.equal(
      (updated.body.sale as Record<string, unknown>).totalAmount,
      "25550.00",
    );

    const completed = await request(
      "PATCH",
      `/api/tenant/sales/${saleId}/status`,
      managerToken,
      { status: "COMPLETED" },
    );
    assert.equal(completed.status, 200);
    assert.equal(
      (completed.body.sale as Record<string, unknown>).status,
      "COMPLETED",
    );
    assert.ok((completed.body.sale as Record<string, unknown>).completedAt);

    const [stateRows] = await database.query<StateRow[]>(
      `
        SELECT
          vehicle.status AS vehicleStatus,
          reservation.status AS reservationStatus,
          lead_record.status AS leadStatus,
          customer.status AS customerStatus
        FROM vehicles vehicle
        INNER JOIN vehicle_reservations reservation
          ON reservation.vehicle_id = vehicle.id
          AND reservation.tenant_id = vehicle.tenant_id
        INNER JOIN leads lead_record
          ON lead_record.id = reservation.lead_id
          AND lead_record.tenant_id = reservation.tenant_id
        INNER JOIN customers customer
          ON customer.id = reservation.customer_id
          AND customer.tenant_id = reservation.tenant_id
        WHERE vehicle.id = ?
          AND vehicle.tenant_id = ?
        LIMIT 1
      `,
      [vehicleIds[0], fixture.tenantId],
    );
    assert.equal(stateRows[0]?.vehicleStatus, "SOLD");
    assert.equal(stateRows[0]?.reservationStatus, "CONVERTED");
    assert.equal(stateRows[0]?.leadStatus, "WON");
    assert.equal(stateRows[0]?.customerStatus, "CUSTOMER");

    const immutable = await request(
      "PATCH",
      `/api/tenant/sales/${saleId}`,
      managerToken,
      { notes: "Too late" },
    );
    assert.equal(immutable.status, 409);
  });

  await context.test("cancels a second pending sale with a reason", async () => {
    const created = await request(
      "POST",
      "/api/tenant/sales",
      managerToken,
      {
        locationId: fixture.locationId,
        customerId,
        vehicleId: vehicleIds[1],
        saleDate: new Date().toISOString(),
        vehiclePrice: 24000,
        paymentMethod: "CASH",
      },
    );
    assert.equal(created.status, 201);
    const saleId = (created.body.sale as Record<string, unknown>).id as number;
    saleIds.push(saleId);

    const missingReason = await request(
      "PATCH",
      `/api/tenant/sales/${saleId}/status`,
      managerToken,
      { status: "CANCELLED" },
    );
    assert.equal(missingReason.status, 400);

    const cancelled = await request(
      "PATCH",
      `/api/tenant/sales/${saleId}/status`,
      managerToken,
      { status: "CANCELLED", cancellationReason: "Customer withdrew" },
    );
    assert.equal(cancelled.status, 200);
    assert.equal(
      (cancelled.body.sale as Record<string, unknown>).status,
      "CANCELLED",
    );

    const listed = await request(
      "GET",
      `/api/tenant/sales?status=CANCELLED&vehicleId=${vehicleIds[1]}`,
      readToken,
    );
    assert.equal(listed.status, 200);
    assert.equal((listed.body.sales as unknown[]).length, 1);
  });

  await context.test("releases an expired reservation before reserving again", async () => {
    const [expiredResult] = await database.execute<ResultSetHeader>(
      `
        INSERT INTO vehicle_reservations (
          tenant_id,
          reservation_number,
          vehicle_id,
          customer_id,
          salesperson_user_id,
          status,
          reserved_at,
          expires_at,
          created_by_user_id
        )
        VALUES (
          ?, CONCAT('RES-', UPPER(REPLACE(UUID(), '-', ''))),
          ?, ?, ?, 'ACTIVE',
          DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY),
          DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 DAY),
          ?
        )
      `,
      [
        fixture.tenantId,
        vehicleIds[1],
        customerId,
        fixture.userId,
        fixture.userId,
      ],
    );
    reservationIds.push(expiredResult.insertId);
    await database.execute(
      `UPDATE vehicles SET status = 'RESERVED' WHERE id = ? AND tenant_id = ?`,
      [vehicleIds[1], fixture.tenantId],
    );

    const replacement = await request(
      "POST",
      `/api/tenant/vehicles/${vehicleIds[1]}/reservation`,
      offerToken,
      {
        customerId,
        agreedPrice: 24000,
        expiresAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      },
    );
    assert.equal(replacement.status, 201);
    const replacementId = (
      replacement.body.reservation as Record<string, unknown>
    ).id as number;
    reservationIds.push(replacementId);

    const expired = await request(
      "GET",
      `/api/tenant/reservations/${expiredResult.insertId}`,
      readToken,
    );
    assert.equal(expired.status, 200);
    assert.equal(
      (expired.body.reservation as Record<string, unknown>).status,
      "EXPIRED",
    );
  });
});
