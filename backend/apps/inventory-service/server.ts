import "dotenv/config";
import type inventoryApp from "./app.js";

async function start(): Promise<void> {
    process.env.DB_NAME =
        process.env.INVENTORY_DB_NAME ?? "dealership_inventory";
    const { default: app } = require("./app.js") as {
        default: typeof inventoryApp;
    };
    const port = Number(process.env.INVENTORY_SERVICE_PORT ?? 3005);

    app.listen(port, () => {
        console.log(`Inventory service listening on port:${port}`);
    });
}

void start().catch((error: unknown) => {
    console.error("Inventory service failed to start", error);
    process.exitCode = 1;
});
