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
const testDriveIds: number[] = [];
let writeToken = "";
let readToken = "";
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
  const text = await response.text();

  return {
    status: response.status,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
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
      INNER JOIN users u ON u.tenant_id = t.id
      INNER JOIN locations l ON l.tenant_id = t.id
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
    throw new Error("CRM integration tests require an active tenant fixture");
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
        created_by_user_id
      )
      VALUES (?, 'INDIVIDUAL', 'CRM', 'Integration', ?, ?)
    `,
    [fixture.tenantId, `+381${suffix}`, fixture.userId],
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
      VALUES (?, ?, ?, ?, 'WEBSITE', 'NEW', 'NORMAL', ?)
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
          asking_price,
          created_by_user_id
        )
        VALUES (?, ?, ?, ?, 'USED', 'AVAILABLE', 'CRM', ?, 2024, 1000, 25000, ?)
      `,
      [
        fixture.tenantId,
        fixture.locationId,
        `CRM-${suffix}-${index}`,
        `CRMTEST${suffix}${index}`,
        `Vehicle ${index}`,
        fixture.userId,
      ],
    );
    vehicleIds.push(vehicleResult.insertId);
  }

  writeToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["SALES_MANAGER"], permissions: ["crm.read", "crm.write"] },
  );
  readToken = createTenantAccessToken(
    fixture.userId,
    fixture.tenantId,
    fixture.authVersion,
    { roles: ["SALESPERSON"], permissions: ["crm.read"] },
  );

  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine CRM test server port");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve())),
    );
  }

  for (const testDriveId of testDriveIds) {
    await database.execute("DELETE FROM test_drives WHERE id = ?", [testDriveId]);
  }
  if (leadId) {
    await database.execute("DELETE FROM lead_activities WHERE lead_id = ?", [leadId]);
    await database.execute("DELETE FROM lead_vehicles WHERE lead_id = ?", [leadId]);
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

test("remaining CRM endpoints", async (context) => {
  await context.test("enforces authentication and write permission", async () => {
    const unauthenticated = await request(
      "GET",
      `/api/tenant/leads/${leadId}/vehicles`,
    );
    const forbidden = await request(
      "POST",
      `/api/tenant/leads/${leadId}/vehicles`,
      readToken,
      { vehicleId: vehicleIds[0] },
    );

    assert.equal(unauthenticated.status, 401);
    assert.equal(forbidden.status, 403);
  });

  await context.test("manages lead vehicle interests and primary promotion", async () => {
    const empty = await request(
      "GET",
      `/api/tenant/leads/${leadId}/vehicles`,
      readToken,
    );
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.vehicles, []);

    const first = await request(
      "POST",
      `/api/tenant/leads/${leadId}/vehicles`,
      writeToken,
      { vehicleId: vehicleIds[0], interestNotes: "First choice" },
    );
    assert.equal(first.status, 201);
    assert.equal((first.body.vehicle as Record<string, unknown>).isPrimary, true);

    const second = await request(
      "POST",
      `/api/tenant/leads/${leadId}/vehicles`,
      writeToken,
      { vehicleId: vehicleIds[1], isPrimary: true },
    );
    assert.equal(second.status, 201);

    const updated = await request(
      "PATCH",
      `/api/tenant/leads/${leadId}/vehicles/${vehicleIds[0]}`,
      writeToken,
      { isPrimary: true, interestNotes: "Preferred" },
    );
    assert.equal(updated.status, 200);
    assert.equal((updated.body.vehicle as Record<string, unknown>).isPrimary, true);

    const removed = await request(
      "DELETE",
      `/api/tenant/leads/${leadId}/vehicles/${vehicleIds[0]}`,
      writeToken,
    );
    assert.equal(removed.status, 204);

    const remaining = await request(
      "GET",
      `/api/tenant/leads/${leadId}/vehicles`,
      readToken,
    );
    const interests = remaining.body.vehicles as Array<Record<string, unknown>>;
    assert.equal(interests.length, 1);
    assert.equal(interests[0]?.isPrimary, true);

    const clearOnlyPrimary = await request(
      "PATCH",
      `/api/tenant/leads/${leadId}/vehicles/${vehicleIds[1]}`,
      writeToken,
      { isPrimary: false },
    );
    assert.equal(clearOnlyPrimary.status, 409);
  });

  await context.test("manages activities and synchronizes lead follow-up data", async () => {
    const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const created = await request(
      "POST",
      `/api/tenant/leads/${leadId}/activities`,
      writeToken,
      {
        activityType: "FOLLOW_UP",
        subject: "Call customer",
        scheduledAt: scheduledAt.toISOString(),
      },
    );
    assert.equal(created.status, 201);
    const activity = created.body.activity as Record<string, unknown>;
    const activityId = activity.id as number;
    assert.equal(activity.status, "SCHEDULED");

    const leadWithFollowUp = await request(
      "GET",
      `/api/tenant/leads/${leadId}`,
      readToken,
    );
    assert.ok(
      (leadWithFollowUp.body.lead as Record<string, unknown>).nextFollowUpAt,
    );

    const listed = await request(
      "GET",
      `/api/tenant/lead-activities?leadId=${leadId}&status=SCHEDULED`,
      readToken,
    );
    assert.equal(listed.status, 200);
    assert.equal((listed.body.activities as unknown[]).length, 1);

    const rescheduledAt = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
    const updated = await request(
      "PATCH",
      `/api/tenant/lead-activities/${activityId}`,
      writeToken,
      { scheduledAt: rescheduledAt.toISOString(), subject: "Updated call" },
    );
    assert.equal(updated.status, 200);

    const completed = await request(
      "PATCH",
      `/api/tenant/lead-activities/${activityId}/status`,
      writeToken,
      { status: "COMPLETED", outcome: "Reached customer" },
    );
    assert.equal(completed.status, 200);
    assert.ok((completed.body.activity as Record<string, unknown>).completedAt);

    const leadWithoutFollowUp = await request(
      "GET",
      `/api/tenant/leads/${leadId}`,
      readToken,
    );
    assert.equal(
      (leadWithoutFollowUp.body.lead as Record<string, unknown>).nextFollowUpAt,
      null,
    );

    const completedCall = await request(
      "POST",
      `/api/tenant/leads/${leadId}/activities`,
      writeToken,
      {
        activityType: "CALL",
        status: "COMPLETED",
        subject: "Completed call",
        outcome: "Customer contacted",
      },
    );
    assert.equal(completedCall.status, 201);

    const contactedLead = await request(
      "GET",
      `/api/tenant/leads/${leadId}`,
      readToken,
    );
    assert.ok((contactedLead.body.lead as Record<string, unknown>).lastContactAt);

    const cancellable = await request(
      "POST",
      `/api/tenant/leads/${leadId}/activities`,
      writeToken,
      {
        activityType: "FOLLOW_UP",
        scheduledAt: new Date(
          scheduledAt.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    );
    assert.equal(cancellable.status, 201);
    const cancellableId = (
      cancellable.body.activity as Record<string, unknown>
    ).id as number;

    const cancelledActivity = await request(
      "PATCH",
      `/api/tenant/lead-activities/${cancellableId}/status`,
      writeToken,
      { status: "CANCELLED", outcome: "Customer unavailable" },
    );
    assert.equal(cancelledActivity.status, 200);

    const rescheduledActivity = await request(
      "PATCH",
      `/api/tenant/lead-activities/${cancellableId}/status`,
      writeToken,
      {
        status: "SCHEDULED",
        scheduledAt: new Date(
          scheduledAt.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    );
    assert.equal(rescheduledActivity.status, 200);
    assert.equal(
      (rescheduledActivity.body.activity as Record<string, unknown>).status,
      "SCHEDULED",
    );

    const statusChange = await request(
      "PATCH",
      `/api/tenant/leads/${leadId}/status`,
      writeToken,
      { status: "CONTACTED" },
    );
    assert.equal(statusChange.status, 200);

    const history = await request(
      "GET",
      `/api/tenant/lead-activities?leadId=${leadId}&activityType=STATUS_CHANGE`,
      readToken,
    );
    assert.equal(history.status, 200);
    assert.equal((history.body.activities as unknown[]).length, 1);
  });

  await context.test("schedules, filters, updates, and completes test drives", async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const createBody = {
      locationId: fixture.locationId,
      leadId,
      customerId,
      vehicleId: vehicleIds[0],
      salespersonUserId: fixture.userId,
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
      notes: "Initial booking",
    };
    const created = await request(
      "POST",
      "/api/tenant/test-drives",
      writeToken,
      createBody,
    );
    assert.equal(created.status, 201);
    const testDrive = created.body.testDrive as Record<string, unknown>;
    const testDriveId = testDrive.id as number;
    testDriveIds.push(testDriveId);
    assert.equal(testDrive.status, "SCHEDULED");

    const vehicleConflict = await request(
      "POST",
      "/api/tenant/test-drives",
      writeToken,
      createBody,
    );
    assert.equal(vehicleConflict.status, 409);

    const salespersonConflict = await request(
      "POST",
      "/api/tenant/test-drives",
      writeToken,
      { ...createBody, vehicleId: vehicleIds[1] },
    );
    assert.equal(salespersonConflict.status, 409);

    const adjacentEnd = new Date(end.getTime() + 30 * 60 * 1000);
    const adjacent = await request(
      "POST",
      "/api/tenant/test-drives",
      writeToken,
      {
        ...createBody,
        scheduledStart: end.toISOString(),
        scheduledEnd: adjacentEnd.toISOString(),
        notes: "Adjacent booking",
      },
    );
    assert.equal(adjacent.status, 201);
    const adjacentTestDriveId = (
      adjacent.body.testDrive as Record<string, unknown>
    ).id as number;
    testDriveIds.push(adjacentTestDriveId);

    const listed = await request(
      "GET",
      `/api/tenant/test-drives?leadId=${leadId}`,
      readToken,
    );
    assert.equal(listed.status, 200);
    assert.equal((listed.body.testDrives as unknown[]).length, 2);

    const missingCancellationReason = await request(
      "PATCH",
      `/api/tenant/test-drives/${adjacentTestDriveId}/status`,
      writeToken,
      { status: "CANCELLED" },
    );
    assert.equal(missingCancellationReason.status, 400);

    const cancelled = await request(
      "PATCH",
      `/api/tenant/test-drives/${adjacentTestDriveId}/status`,
      writeToken,
      { status: "CANCELLED", cancellationReason: "Customer unavailable" },
    );
    assert.equal(cancelled.status, 200);
    assert.equal(
      (cancelled.body.testDrive as Record<string, unknown>).cancellationReason,
      "Customer unavailable",
    );

    const detail = await request(
      "GET",
      `/api/tenant/test-drives/${testDriveId}`,
      readToken,
    );
    assert.equal(detail.status, 200);

    const newStart = new Date(start.getTime() + 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);
    const updated = await request(
      "PATCH",
      `/api/tenant/test-drives/${testDriveId}`,
      writeToken,
      {
        scheduledStart: newStart.toISOString(),
        scheduledEnd: newEnd.toISOString(),
        notes: "Rescheduled",
      },
    );
    assert.equal(updated.status, 200);

    const started = await request(
      "PATCH",
      `/api/tenant/test-drives/${testDriveId}/status`,
      writeToken,
      { status: "IN_PROGRESS" },
    );
    assert.equal(started.status, 200);
    assert.ok((started.body.testDrive as Record<string, unknown>).actualStart);

    const completed = await request(
      "PATCH",
      `/api/tenant/test-drives/${testDriveId}/status`,
      writeToken,
      { status: "COMPLETED" },
    );
    assert.equal(completed.status, 200);
    assert.ok((completed.body.testDrive as Record<string, unknown>).actualEnd);

    const invalidTransition = await request(
      "PATCH",
      `/api/tenant/test-drives/${testDriveId}/status`,
      writeToken,
      { status: "CANCELLED", cancellationReason: "Too late" },
    );
    assert.equal(invalidTransition.status, 409);
  });
});
