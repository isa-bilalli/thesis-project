import express from "express";
import cors from "cors";
import { authRouter } from "./modules/identity/auth.routes";
import { errorHandler } from "./shared/middleware/error-handler";
import { database } from "./config/database";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin:"http://localhost:5173",
        credentials: true,
    }),
);

app.use(express.json());
app.use(cookieParser())

app.get("/api/health", async (req, res) =>{
    try{
        await database.query('SELECT 1');

        res.json({
            status: "healthy",
            database: "connected",
        });
    }catch{
        res.status(503).json({
            status: "unhealthy",
            database: "disconnected",
        })
    }
})

app.use("/api/auth", authRouter);
app.use(errorHandler);

export default app;
