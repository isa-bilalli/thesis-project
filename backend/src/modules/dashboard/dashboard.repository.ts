import type { RowDataPacket } from "mysql2";
import { database } from "../../config/database.js";

interface CountValueRow extends RowDataPacket {
  total: number | string | null;
  available?: number | string | null;
  reserved?: number | string | null;
  activeLeads?: number | string | null;
  upcomingTestDrives?: number | string | null;
  openOffers?: number | string | null;
  activeReservations?: number | string | null;
  completedSalesThisMonth?: number | string | null;
}

interface DealershipRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  currencyCode: string;
  timezone: string;
  primaryLocationId: number | null;
  primaryLocationName: string | null;
  primaryLocationCity: string | null;
}

interface RecentVehicleRow extends RowDataPacket {
  id: number;
  stockNumber: string;
  make: string;
  model: string;
  modelYear: number;
  status: string;
  askingPrice: string | null;
  primaryImageUrl: string | null;
  updatedAt: Date;
}

interface UpcomingTestDriveRow extends RowDataPacket {
  id: number;
  customerName: string;
  vehicleName: string;
  salespersonName: string;
  locationName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: string;
}

interface RecentSaleRow extends RowDataPacket {
  id: number;
  saleNumber: string;
  customerName: string;
  vehicleName: string;
  salespersonName: string;
  totalAmount: string;
  saleDate: Date;
  status: string;
}

export interface DashboardAccess {
  inventory: boolean;
  crm: boolean;
  sales: boolean;
}

export interface TenantDashboardData {
  dealership: {
    id: number;
    name: string;
    slug: string;
    currencyCode: string;
    timezone: string;
    primaryLocation: {
      id: number;
      name: string;
      city: string;
    } | null;
  };
  access: DashboardAccess;
  metrics: {
    inventoryTotal: number | null;
    inventoryAvailable: number | null;
    inventoryReserved: number | null;
    activeLeads: number | null;
    upcomingTestDrives: number | null;
    openOffers: number | null;
    activeReservations: number | null;
    completedSalesThisMonth: number | null;
  };
  recentVehicles: RecentVehicleRow[];
  upcomingTestDrives: UpcomingTestDriveRow[];
  recentSales: RecentSaleRow[];
}

function numberValue(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export async function getTenantDashboardData(
  tenantId: number,
  access: DashboardAccess,
): Promise<TenantDashboardData | null> {
  const [dealershipRows] = await database.execute<DealershipRow[]>(
    `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.currency_code AS currencyCode,
        t.timezone,
        l.id AS primaryLocationId,
        l.name AS primaryLocationName,
        l.city AS primaryLocationCity
      FROM tenants t
      LEFT JOIN locations l
        ON l.tenant_id = t.id
        AND l.is_primary = TRUE
        AND l.deleted_at IS NULL
      WHERE t.id = ?
        AND t.status = 'ACTIVE'
        AND t.deleted_at IS NULL
      LIMIT 1
    `,
    [tenantId],
  );

  const dealership = dealershipRows[0];

  if (!dealership) {
    return null;
  }

  const inventoryPromise = access.inventory
    ? Promise.all([
        database.execute<CountValueRow[]>(
          `
            SELECT
              COUNT(*) AS total,
              COALESCE(SUM(status = 'AVAILABLE'), 0) AS available,
              COALESCE(SUM(status = 'RESERVED'), 0) AS reserved
            FROM vehicles
            WHERE tenant_id = ?
              AND deleted_at IS NULL
          `,
          [tenantId],
        ),
        database.execute<RecentVehicleRow[]>(
          `
            SELECT
              id,
              stock_number AS stockNumber,
              make,
              model,
              model_year AS modelYear,
              status,
              asking_price AS askingPrice,
              primary_image_url AS primaryImageUrl,
              updated_at AS updatedAt
            FROM vehicles
            WHERE tenant_id = ?
              AND deleted_at IS NULL
            ORDER BY updated_at DESC, id DESC
            LIMIT 5
          `,
          [tenantId],
        ),
      ])
    : Promise.resolve(null);

  const crmPromise = access.crm
    ? Promise.all([
        database.execute<CountValueRow[]>(
          `
            SELECT
              (
                SELECT COUNT(*)
                FROM leads
                WHERE tenant_id = ?
                  AND status IN ('NEW', 'CONTACTED', 'QUALIFIED')
                  AND deleted_at IS NULL
              ) AS activeLeads,
              (
                SELECT COUNT(*)
                FROM test_drives
                WHERE tenant_id = ?
                  AND status IN ('SCHEDULED', 'IN_PROGRESS')
                  AND scheduled_end >= UTC_TIMESTAMP(3)
              ) AS upcomingTestDrives
          `,
          [tenantId, tenantId],
        ),
        database.execute<UpcomingTestDriveRow[]>(
          `
            SELECT
              td.id,
              CASE
                WHEN c.customer_type = 'BUSINESS' THEN c.company_name
                ELSE CONCAT(c.first_name, ' ', c.last_name)
              END AS customerName,
              CONCAT(v.model_year, ' ', v.make, ' ', v.model) AS vehicleName,
              CONCAT(u.first_name, ' ', u.last_name) AS salespersonName,
              l.name AS locationName,
              td.scheduled_start AS scheduledStart,
              td.scheduled_end AS scheduledEnd,
              td.status
            FROM test_drives td
            INNER JOIN customers c
              ON c.id = td.customer_id
              AND c.tenant_id = td.tenant_id
            INNER JOIN vehicles v
              ON v.id = td.vehicle_id
              AND v.tenant_id = td.tenant_id
            INNER JOIN users u
              ON u.id = td.salesperson_user_id
              AND u.tenant_id = td.tenant_id
            INNER JOIN locations l
              ON l.id = td.location_id
              AND l.tenant_id = td.tenant_id
            WHERE td.tenant_id = ?
              AND td.status IN ('SCHEDULED', 'IN_PROGRESS')
              AND td.scheduled_end >= UTC_TIMESTAMP(3)
            ORDER BY td.scheduled_start ASC, td.id ASC
            LIMIT 5
          `,
          [tenantId],
        ),
      ])
    : Promise.resolve(null);

  const salesPromise = access.sales
    ? Promise.all([
        database.execute<CountValueRow[]>(
          `
            SELECT
              (
                SELECT COUNT(*)
                FROM offers
                WHERE tenant_id = ?
                  AND status IN ('DRAFT', 'SENT', 'ACCEPTED')
              ) AS openOffers,
              (
                SELECT COUNT(*)
                FROM vehicle_reservations
                WHERE tenant_id = ?
                  AND status = 'ACTIVE'
                  AND expires_at > UTC_TIMESTAMP(3)
              ) AS activeReservations,
              (
                SELECT COUNT(*)
                FROM sales
                WHERE tenant_id = ?
                  AND status = 'COMPLETED'
                  AND completed_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01 00:00:00')
              ) AS completedSalesThisMonth
          `,
          [tenantId, tenantId, tenantId],
        ),
        database.execute<RecentSaleRow[]>(
          `
            SELECT
              s.id,
              s.sale_number AS saleNumber,
              CASE
                WHEN c.customer_type = 'BUSINESS' THEN c.company_name
                ELSE CONCAT(c.first_name, ' ', c.last_name)
              END AS customerName,
              CONCAT(v.model_year, ' ', v.make, ' ', v.model) AS vehicleName,
              CONCAT(u.first_name, ' ', u.last_name) AS salespersonName,
              s.total_amount AS totalAmount,
              s.sale_date AS saleDate,
              s.status
            FROM sales s
            INNER JOIN customers c
              ON c.id = s.customer_id
              AND c.tenant_id = s.tenant_id
            INNER JOIN vehicles v
              ON v.id = s.vehicle_id
              AND v.tenant_id = s.tenant_id
            INNER JOIN users u
              ON u.id = s.salesperson_user_id
              AND u.tenant_id = s.tenant_id
            WHERE s.tenant_id = ?
            ORDER BY s.sale_date DESC, s.id DESC
            LIMIT 5
          `,
          [tenantId],
        ),
      ])
    : Promise.resolve(null);

  const [inventoryResult, crmResult, salesResult] = await Promise.all([
    inventoryPromise,
    crmPromise,
    salesPromise,
  ]);

  const inventoryCounts = inventoryResult?.[0][0][0];
  const crmCounts = crmResult?.[0][0][0];
  const salesCounts = salesResult?.[0][0][0];

  return {
    dealership: {
      id: dealership.id,
      name: dealership.name,
      slug: dealership.slug,
      currencyCode: dealership.currencyCode,
      timezone: dealership.timezone,
      primaryLocation:
        dealership.primaryLocationId &&
        dealership.primaryLocationName &&
        dealership.primaryLocationCity
          ? {
              id: dealership.primaryLocationId,
              name: dealership.primaryLocationName,
              city: dealership.primaryLocationCity,
            }
          : null,
    },
    access,
    metrics: {
      inventoryTotal: access.inventory
        ? numberValue(inventoryCounts?.total)
        : null,
      inventoryAvailable: access.inventory
        ? numberValue(inventoryCounts?.available)
        : null,
      inventoryReserved: access.inventory
        ? numberValue(inventoryCounts?.reserved)
        : null,
      activeLeads: access.crm ? numberValue(crmCounts?.activeLeads) : null,
      upcomingTestDrives: access.crm
        ? numberValue(crmCounts?.upcomingTestDrives)
        : null,
      openOffers: access.sales ? numberValue(salesCounts?.openOffers) : null,
      activeReservations: access.sales
        ? numberValue(salesCounts?.activeReservations)
        : null,
      completedSalesThisMonth: access.sales
        ? numberValue(salesCounts?.completedSalesThisMonth)
        : null,
    },
    recentVehicles: inventoryResult?.[1][0] ?? [],
    upcomingTestDrives: crmResult?.[1][0] ?? [],
    recentSales: salesResult?.[1][0] ?? [],
  };
}
