import "dotenv/config";
import { provisionServiceDatabase } from "../../shared/database/provision-service-database.js";

async function main(): Promise<void> {
    const sourceDatabase =
        process.env.MONOLITH_DB_NAME ?? process.env.DB_NAME ?? "dealership_saas";
    const targetDatabase =
        process.env.INVENTORY_DB_NAME ?? "dealership_inventory";

    await provisionServiceDatabase({
        sourceDatabase,
        targetDatabase,
        tables: [
            "tenants",
            "locations",
            "users",
            "customers",
            "leads",
            "offers",
            "vehicles",
            "vehicle_reservations",
        ],
    });

    process.env.DB_NAME = targetDatabase;
    process.env.MIGRATION_SCOPE = "all";
    process.env.MIGRATIONS_DIRECTORY =
        "apps/inventory-service/database/migrations";
    await import("../../../database/migrate.js");
}

void main().catch((error: unknown) => {
    console.error("Inventory migration failed", error);
    process.exitCode = 1;
});
