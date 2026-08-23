import "dotenv/config";

process.env.DB_NAME = process.env.ACCESS_DB_NAME ?? "dealership_access";
process.env.MIGRATION_SCOPE = "access";

async function main(): Promise<void> {
    await import("../../../database/migrate.js");
}

void main().catch((error: unknown) => {
    console.error("Access migration failed to start", error);
    process.exitCode = 1;
});
