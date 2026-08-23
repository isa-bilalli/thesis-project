import cors from "cors";
import express from "express";
import { database } from "../../src/config/database.js";
import { crmRouter } from "../../src/modules/crm/crm.routes.js";
import { errorHandler } from "../../src/shared/middleware/error-handler.js";
import { requireTenantAuth } from "../../src/shared/middleware/require-tenant-auth.js";
import { hydrateCrmReferences } from "./hydrate-references.js";
import { crmInternalRouter } from "./internal.routes.js";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());

app.get("/crm/health", (_request, response) => {
    response.status(200).json({
        service: "crm",
        status: "ok",
    });
});

app.get("/health/live", (_request, response) => {
    response.json({ service: "crm", status: "alive" });
});

app.get("/health/ready", async (_request, response) => {
    try {
        await database.query("SELECT 1");
        response.json({
            service: "crm",
            status: "ready",
            database: "connected",
        });
    } catch {
        response.status(503).json({
            service: "crm",
            status: "not_ready",
            database: "disconnected",
        });
    }
});

app.use("/internal", crmInternalRouter);
app.use("/api/tenant", requireTenantAuth, hydrateCrmReferences);
app.use("/api", crmRouter);
app.use(errorHandler);

export default app;
