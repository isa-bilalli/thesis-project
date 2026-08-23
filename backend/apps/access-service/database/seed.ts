import "dotenv/config";

process.env.DB_NAME = process.env.ACCESS_DB_NAME ?? "dealership_access";

async function main(): Promise<void> {
    await import("../../../database/seed.js");
}

void main().catch((error: unknown) => {
    console.error("Access seed failed to start", error);
    process.exitCode = 1;
});
