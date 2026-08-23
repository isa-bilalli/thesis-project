import cors from "cors";
import express from "express";
import { database } from "../../src/config/database.js";
import { inventoryRouter } from "../../src/modules/inventory/inventory.routes.js";
import { errorHandler } from "../../src/shared/middleware/error-handler.js";
import { requireTenantAuth } from "../../src/shared/middleware/require-tenant-auth.js";
import { hydrateInventoryReferences } from "./hydrate-references.js";
import { inventoryInternalRouter } from "./internal.routes.js";
import { inventoryReservationRouter } from "./reservation.routes.js";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());

app.get("/inventory/health", (_request, response) => {
    response.status(200).json({
        service: "inventory",
        status: "ok",
    });
});

app.get("/health/live", (_request, response) => {
    response.json({ service: "inventory", status: "alive" });
});

app.get("/health/ready", async (_request, response) => {
    try {
        await database.query("SELECT 1");
        response.json({
            service: "inventory",
            status: "ready",
            database: "connected",
        });
    } catch {
        response.status(503).json({
            service: "inventory",
            status: "not_ready",
            database: "disconnected",
        });
    }
});

app.use("/internal", inventoryInternalRouter);
app.use(
    "/api/tenant/vehicles",
    requireTenantAuth,
    hydrateInventoryReferences,
);
app.use("/api", inventoryRouter);
app.use("/api", inventoryReservationRouter);
app.use(errorHandler);

export default app;
