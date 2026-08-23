import app from "./app";

const port = Number(process.env.SALES_SERVICE_PORT ?? 3006);

app.listen(port, () => {
    console.log(`Sales service listening on port:${port}`);
});
