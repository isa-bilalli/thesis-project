import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { database } from "../../src/config/database.js";
import { identityRouter } from "../../src/modules/identity/identity.routes.js";
import { tenancyRouter } from "../../src/modules/tenancy/tenancy.routes.js";
import { errorHandler } from "../../src/shared/middleware/error-handler.js";
import { accessInternalRouter } from "./internal.routes.js";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/access/health", (_request, response) => {
    response.status(200).json({
        service: "access",
        status: "ok",
    });
});

app.get("/health/live", (_request, response) => {
    response.status(200).json({
        service: "access",
        status: "alive",
    });
});

app.get("/health/ready", async (_request, response) => {
    try {
        await database.query("SELECT 1");
        response.status(200).json({
            service: "access",
            status: "ready",
            database: "connected",
        });
    } catch {
        response.status(503).json({
            service: "access",
            status: "not_ready",
            database: "disconnected",
        });
    }
});

app.use("/internal", accessInternalRouter);
app.use("/api", identityRouter);
app.use("/api", tenancyRouter);
app.use(errorHandler);

export default app;
