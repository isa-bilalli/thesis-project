import "dotenv/config";
import { provisionServiceDatabase } from "../../shared/database/provision-service-database.js";

async function main(): Promise<void> {
    const sourceDatabase =
        process.env.MONOLITH_DB_NAME ?? process.env.DB_NAME ?? "dealership_saas";
    const targetDatabase = process.env.CRM_DB_NAME ?? "dealership_crm";

    await provisionServiceDatabase({
        sourceDatabase,
        targetDatabase,
        tables: [
            "tenants",
            "locations",
            "users",
            "vehicles",
            "customers",
            "leads",
            "lead_vehicles",
            "lead_activities",
            "test_drives",
        ],
    });

    process.env.DB_NAME = targetDatabase;
    process.env.MIGRATION_SCOPE = "all";
    process.env.MIGRATIONS_DIRECTORY = "apps/crm-service/database/migrations";
    await import("../../../database/migrate.js");
}

void main().catch((error: unknown) => {
    console.error("CRM migration failed", error);
    process.exitCode = 1;
});
