import express from "express";
import cors from "cors";

import { db } from "./config/database";

const app = express();

app.use(
    cors({
        origin:"http://localhost:5173",
    }),
);

app.use(express.json());

app.get("/api/health", async (req, res) =>{
    try{
        await db.query('SELECT 1');

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

export default app;