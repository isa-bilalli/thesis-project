import "dotenv/config";
import type crmApp from "./app.js";

async function start(): Promise<void> {
    process.env.DB_NAME = process.env.CRM_DB_NAME ?? "dealership_crm";
    const { default: app } = require("./app.js") as {
        default: typeof crmApp;
    };
    const port = Number(process.env.CRM_SERVICE_PORT ?? 3003);

    app.listen(port, () => {
        console.log(`CRM service listening on port:${port}`);
    });
}

void start().catch((error: unknown) => {
    console.error("CRM service failed to start", error);
    process.exitCode = 1;
});
