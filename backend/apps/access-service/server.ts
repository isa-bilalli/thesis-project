import "dotenv/config";
import type accessApp from "./app.js";

async function start(): Promise<void> {
    process.env.DB_NAME = process.env.ACCESS_DB_NAME ?? "dealership_access";
    const { default: app } = require("./app.js") as {
        default: typeof accessApp;
    };
    const port = Number(process.env.ACCESS_SERVICE_PORT ?? 3002);

    app.listen(port, () => {
        console.log(`Access service listening on port:${port}`);
    });
}

void start().catch((error: unknown) => {
    console.error("Access service failed to start", error);
    process.exitCode = 1;
});
