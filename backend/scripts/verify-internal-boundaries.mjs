import "dotenv/config";
import mysql from "mysql2/promise";

const sourceDatabase =
  process.env.MONOLITH_DB_NAME ?? process.env.DB_NAME ?? "dealership_saas";
const inventoryDatabase =
  process.env.INVENTORY_DB_NAME ?? "dealership_inventory";
const internalSecret =
  process.env.INTERNAL_SERVICE_SECRET ?? "development-internal-secret";
const crmUrl = process.env.CRM_SERVICE_URL ?? "http://127.0.0.1:3003";
const inventoryUrl =
  process.env.INVENTORY_SERVICE_URL ?? "http://127.0.0.1:3005";
const salesUrl = process.env.SALES_SERVICE_URL ?? "http://127.0.0.1:3006";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: sourceDatabase,
});

let vehicleId = 0;
let offerId = 0;
let tenantId = 0;

async function internalGet(url) {
  const response = await fetch(url, {
    headers: { "x-internal-service-key": internalSecret },
  });

  if (response.status !== 200) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

try {
  const [rows] = await connection.query(
    `SELECT
       tenant.id AS tenantId,
       (SELECT id FROM users
        WHERE tenant_id = tenant.id AND status = 'ACTIVE'
          AND deleted_at IS NULL LIMIT 1) AS userId,
       (SELECT id FROM locations
        WHERE tenant_id = tenant.id AND status = 'ACTIVE'
          AND deleted_at IS NULL LIMIT 1) AS locationId,
       (SELECT id FROM customers
        WHERE tenant_id = tenant.id AND deleted_at IS NULL LIMIT 1) AS customerId,
       (SELECT id FROM leads
        WHERE tenant_id = tenant.id AND deleted_at IS NULL LIMIT 1) AS leadId,
       (SELECT id FROM vehicles
        WHERE tenant_id = tenant.id AND deleted_at IS NULL LIMIT 1) AS sourceVehicleId
     FROM tenants tenant
     WHERE tenant.status = 'ACTIVE' AND tenant.deleted_at IS NULL
     HAVING userId IS NOT NULL AND locationId IS NOT NULL
       AND customerId IS NOT NULL AND leadId IS NOT NULL
       AND sourceVehicleId IS NOT NULL
     LIMIT 1`,
  );
  const fixture = rows[0];

  if (!fixture) {
    throw new Error("An active customer, lead, and offer fixture is required");
  }

  tenantId = fixture.tenantId;
  const [offerInsertResult] = await connection.execute(
    `INSERT INTO offers (
       tenant_id, location_id, offer_number, customer_id, vehicle_id,
       salesperson_user_id, vehicle_price, status
     ) VALUES (?, ?, ?, ?, ?, ?, 25000, 'DRAFT')`,
    [
      fixture.tenantId,
      fixture.locationId,
      `INTERNAL-${Date.now()}`,
      fixture.customerId,
      fixture.sourceVehicleId,
      fixture.userId,
    ],
  );
  offerId = offerInsertResult.insertId;

  await connection.query(`USE \`${inventoryDatabase}\``);
  const [insertResult] = await connection.execute(
    `INSERT INTO vehicles (
       tenant_id, location_id, stock_number, vehicle_condition, status,
       make, model, model_year, mileage_km, asking_price, created_by_user_id
     ) VALUES (?, ?, ?, 'USED', 'AVAILABLE',
               'Internal', 'Commit', 2026, 1, 25000, ?)`,
    [
      fixture.tenantId,
      fixture.locationId,
      `INTERNAL-${Date.now()}`,
      fixture.userId,
    ],
  );
  vehicleId = insertResult.insertId;

  await internalGet(
    `${crmUrl}/internal/customers/${fixture.customerId}?tenantId=${tenantId}`,
  );
  await internalGet(
    `${crmUrl}/internal/leads/${fixture.leadId}?tenantId=${tenantId}`,
  );
  await internalGet(
    `${salesUrl}/internal/offers/${offerId}?tenantId=${tenantId}`,
  );
  await internalGet(
    `${inventoryUrl}/internal/vehicles/${vehicleId}?tenantId=${tenantId}`,
  );

  const operationId = `commit-${Date.now()}`;
  const commit = async () => {
    const response = await fetch(
      `${inventoryUrl}/internal/vehicles/${vehicleId}/commit-sale`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-service-key": internalSecret,
        },
        body: JSON.stringify({
          tenantId,
          updatedByUserId: fixture.userId,
          operationId,
        }),
      },
    );
    const body = await response.json();

    if (response.status !== 200 || body.status !== "SOLD") {
      throw new Error(`commit-sale returned HTTP ${response.status}`);
    }

    return body;
  };

  const firstCommit = await commit();
  const replayedCommit = await commit();

  if (firstCommit.vehicleId !== replayedCommit.vehicleId) {
    throw new Error("The idempotent commit-sale replay did not match");
  }

  console.log(
    JSON.stringify({
      customer: 200,
      lead: 200,
      offer: 200,
      vehicle: 200,
      commitSale: 200,
      idempotentReplay: 200,
      status: replayedCommit.status,
    }),
  );
} finally {
  if (vehicleId && tenantId) {
    await connection.execute(
      "DELETE FROM inventory_operations WHERE tenant_id = ? AND resource_id = ?",
      [tenantId, vehicleId],
    );
    await connection.execute("DELETE FROM vehicles WHERE id = ?", [vehicleId]);
  }
  if (offerId) {
    await connection.query(`USE \`${sourceDatabase}\``);
    await connection.execute("DELETE FROM offers WHERE id = ?", [offerId]);
  }

  await connection.end();
}
