import express from "express";
import { errorHandler } from "../../src/shared/middleware/error-handler.js";
import { salesInternalRouter } from "./internal.routes.js";

const app = express();

app.use(express.json());

app.get("/sales/health", (_request, response) => {
    response.status(200).json({
        service: "sales",
        status: "ok",
    });
});

app.use("/internal", salesInternalRouter);
app.use(errorHandler);

export default app;
