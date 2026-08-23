import express from 'express';

const app = express();

app.use(express.json());

app.get("/dashboard/health", (_request, response) => {
        response.status(200).json({
            service: "dashboard",
            status: "ok",
        });
    });

export default app;