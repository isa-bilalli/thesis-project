import type { RowDataPacket } from "mysql2";
import { database } from "../../../src/config/database.js";
import { AppError } from "../../../src/shared/errors/app-error.js";
import { internalServiceHeaders } from "./require-internal-service.js";

interface ExistsRow extends RowDataPacket {
    id: number;
}

interface UserReference {
    id: number;
    tenantId: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    deletedAt: string | null;
}

interface LocationReference {
    id: number;
    tenantId: number;
    name: string;
    code: string;
    status: string;
    deletedAt: string | null;
}

interface VehicleReference {
    id: number;
    tenantId: number;
    locationId: number;
    stockNumber: string;
    vehicleCondition: string;
    status: string;
    make: string;
    model: string;
    modelYear: number;
    askingPrice: string | null;
    primaryImageUrl: string | null;
    createdByUserId: number;
    deletedAt: string | null;
}

interface CustomerReference {
    id: number;
    tenantId: number;
    customerType: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string;
    status: string;
    createdByUserId: number;
    deletedAt: string | null;
}

interface LeadReference {
    id: number;
    tenantId: number;
    customerId: number;
    locationId: number;
    source: string;
    priority: string;
    status: string;
    createdByUserId: number;
    deletedAt: string | null;
}

interface OfferReference {
    id: number;
    tenantId: number;
    offerNumber: string;
    locationId: number;
    leadId: number | null;
    customerId: number;
    vehicleId: number;
    salespersonUserId: number;
    vehiclePrice: string;
    discountAmount: string;
    taxAmount: string;
    feeAmount: string;
    status: string;
}

async function localReferenceExists(
    table: string,
    tenantId: number,
    id: number,
): Promise<boolean> {
    const allowedTables = new Set([
        "users",
        "locations",
        "vehicles",
        "customers",
        "leads",
        "offers",
    ]);

    if (!allowedTables.has(table)) {
        throw new Error(`Unsupported projection table: ${table}`);
    }

    const activeClause = table === "offers" ? "" : "AND deleted_at IS NULL";
    const [rows] = await database.execute<ExistsRow[]>(
        `SELECT id FROM ${table}
         WHERE id = ? AND tenant_id = ? ${activeClause}
         LIMIT 1`,
        [id, tenantId],
    );

    return Boolean(rows[0]);
}

async function removeProjection(
    table: string,
    tenantId: number,
    id: number,
): Promise<void> {
    const allowedTables = new Set([
        "users",
        "locations",
        "vehicles",
        "customers",
        "leads",
        "offers",
    ]);

    if (!allowedTables.has(table)) {
        throw new Error(`Unsupported projection table: ${table}`);
    }

    await database.execute(
        `DELETE FROM ${table} WHERE id = ? AND tenant_id = ?`,
        [id, tenantId],
    );
}

async function fetchReference<T>(
    url: string,
    property: string,
    table: string,
    tenantId: number,
    id: number,
): Promise<T | null> {
    try {
        const response = await fetch(url, {
            headers: internalServiceHeaders(),
            signal: AbortSignal.timeout(2_000),
        });

        if (response.status === 404) {
            await removeProjection(table, tenantId, id);
            return null;
        }

        if (!response.ok) {
            throw new Error(`Reference service returned ${response.status}`);
        }

        const payload = (await response.json()) as Record<string, T>;
        const reference = payload[property];

        if (!reference) {
            throw new Error(`Reference response is missing ${property}`);
        }

        return reference;
    } catch (error) {
        if (await localReferenceExists(table, tenantId, id)) {
            return null;
        }

        throw new AppError(
            503,
            `Unable to validate ${table.slice(0, -1)} reference`,
        );
    }
}

export async function hydrateUserProjection(
    tenantId: number,
    userId: number,
): Promise<void> {
    const baseUrl = process.env.ACCESS_SERVICE_URL ?? "http://127.0.0.1:3002";
    const user = await fetchReference<UserReference>(
        `${baseUrl}/internal/users/${userId}?tenantId=${tenantId}`,
        "user",
        "users",
        tenantId,
        userId,
    );

    if (!user) return;

    await database.execute(
        `INSERT INTO users (
            id, tenant_id, first_name, last_name, email,
            password_hash, status, deleted_at
         ) VALUES (?, ?, ?, ?, ?, 'PROJECTION_ONLY', ?, ?)
         ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name), last_name = VALUES(last_name),
            email = VALUES(email), status = VALUES(status),
            deleted_at = VALUES(deleted_at)`,
        [
            user.id,
            user.tenantId,
            user.firstName,
            user.lastName,
            user.email,
            user.status,
            user.deletedAt,
        ],
    );
}

export async function hydrateLocationProjection(
    tenantId: number,
    locationId: number,
): Promise<void> {
    const baseUrl = process.env.ACCESS_SERVICE_URL ?? "http://127.0.0.1:3002";
    const location = await fetchReference<LocationReference>(
        `${baseUrl}/internal/locations/${locationId}?tenantId=${tenantId}`,
        "location",
        "locations",
        tenantId,
        locationId,
    );

    if (!location) return;

    await database.execute(
        `INSERT INTO locations (
            id, tenant_id, name, code, address_line_1, city,
            country_code, status, deleted_at
         ) VALUES (?, ?, ?, ?, 'Projection', 'Projection', 'XX', ?, ?)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name), code = VALUES(code),
            status = VALUES(status), deleted_at = VALUES(deleted_at)`,
        [
            location.id,
            location.tenantId,
            location.name,
            location.code,
            location.status,
            location.deletedAt,
        ],
    );
}

export async function hydrateVehicleProjection(
    tenantId: number,
    vehicleId: number,
): Promise<void> {
    const baseUrl =
        process.env.INVENTORY_SERVICE_URL ?? "http://127.0.0.1:3005";
    const vehicle = await fetchReference<VehicleReference>(
        `${baseUrl}/internal/vehicles/${vehicleId}?tenantId=${tenantId}`,
        "vehicle",
        "vehicles",
        tenantId,
        vehicleId,
    );

    if (!vehicle) return;

    await database.execute(
        `INSERT INTO vehicles (
            id, tenant_id, location_id, stock_number, vehicle_condition,
            status, make, model, model_year, asking_price,
            primary_image_url, created_by_user_id, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            location_id = VALUES(location_id),
            stock_number = VALUES(stock_number),
            vehicle_condition = VALUES(vehicle_condition),
            status = VALUES(status), make = VALUES(make), model = VALUES(model),
            model_year = VALUES(model_year), asking_price = VALUES(asking_price),
            primary_image_url = VALUES(primary_image_url),
            deleted_at = VALUES(deleted_at)`,
        [
            vehicle.id,
            vehicle.tenantId,
            vehicle.locationId,
            vehicle.stockNumber,
            vehicle.vehicleCondition,
            vehicle.status,
            vehicle.make,
            vehicle.model,
            vehicle.modelYear,
            vehicle.askingPrice,
            vehicle.primaryImageUrl,
            vehicle.createdByUserId,
            vehicle.deletedAt,
        ],
    );
}

export async function hydrateCustomerProjection(
    tenantId: number,
    customerId: number,
): Promise<void> {
    const baseUrl = process.env.CRM_SERVICE_URL ?? "http://127.0.0.1:3003";
    const customer = await fetchReference<CustomerReference>(
        `${baseUrl}/internal/customers/${customerId}?tenantId=${tenantId}`,
        "customer",
        "customers",
        tenantId,
        customerId,
    );

    if (!customer) return;

    await database.execute(
        `INSERT INTO customers (
            id, tenant_id, customer_type, first_name, last_name,
            company_name, phone, status, created_by_user_id, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            customer_type = VALUES(customer_type),
            first_name = VALUES(first_name), last_name = VALUES(last_name),
            company_name = VALUES(company_name), phone = VALUES(phone),
            status = VALUES(status), deleted_at = VALUES(deleted_at)`,
        [
            customer.id,
            customer.tenantId,
            customer.customerType,
            customer.firstName,
            customer.lastName,
            customer.companyName,
            customer.phone,
            customer.status,
            customer.createdByUserId,
            customer.deletedAt,
        ],
    );
}

export async function hydrateLeadProjection(
    tenantId: number,
    leadId: number,
): Promise<void> {
    const baseUrl = process.env.CRM_SERVICE_URL ?? "http://127.0.0.1:3003";
    const lead = await fetchReference<LeadReference>(
        `${baseUrl}/internal/leads/${leadId}?tenantId=${tenantId}`,
        "lead",
        "leads",
        tenantId,
        leadId,
    );

    if (!lead) return;

    await database.execute(
        `INSERT INTO leads (
            id, tenant_id, location_id, customer_id, source,
            status, priority, created_by_user_id, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            location_id = VALUES(location_id), customer_id = VALUES(customer_id),
            source = VALUES(source), status = VALUES(status),
            priority = VALUES(priority), deleted_at = VALUES(deleted_at)`,
        [
            lead.id,
            lead.tenantId,
            lead.locationId,
            lead.customerId,
            lead.source,
            lead.status,
            lead.priority,
            lead.createdByUserId,
            lead.deletedAt,
        ],
    );
}

export async function hydrateOfferProjection(
    tenantId: number,
    offerId: number,
): Promise<void> {
    const baseUrl = process.env.SALES_SERVICE_URL ?? "http://127.0.0.1:3006";
    const offer = await fetchReference<OfferReference>(
        `${baseUrl}/internal/offers/${offerId}?tenantId=${tenantId}`,
        "offer",
        "offers",
        tenantId,
        offerId,
    );

    if (!offer) return;

    await database.execute(
        `INSERT INTO offers (
            id, tenant_id, location_id, offer_number, lead_id,
            customer_id, vehicle_id, salesperson_user_id,
            vehicle_price, discount_amount, tax_amount, fee_amount, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            location_id = VALUES(location_id), offer_number = VALUES(offer_number),
            lead_id = VALUES(lead_id), customer_id = VALUES(customer_id),
            vehicle_id = VALUES(vehicle_id),
            salesperson_user_id = VALUES(salesperson_user_id),
            vehicle_price = VALUES(vehicle_price),
            discount_amount = VALUES(discount_amount),
            tax_amount = VALUES(tax_amount), fee_amount = VALUES(fee_amount),
            status = VALUES(status)`,
        [
            offer.id,
            offer.tenantId,
            offer.locationId,
            offer.offerNumber,
            offer.leadId,
            offer.customerId,
            offer.vehicleId,
            offer.salespersonUserId,
            offer.vehiclePrice,
            offer.discountAmount,
            offer.taxAmount,
            offer.feeAmount,
            offer.status,
        ],
    );
}
