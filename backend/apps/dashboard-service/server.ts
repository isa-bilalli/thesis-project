import app from "./app";

const port = Number(process.env.DASHBOARD_SERVICE_PORT ?? 3004);

app.listen(port, () => {
    console.log(`Dashboard service listening on port:${port}`);
});
