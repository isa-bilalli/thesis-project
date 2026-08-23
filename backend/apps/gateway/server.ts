import app from './app';

const port = Number(process.env.GATEWAY_PORT ?? 3000);

app.listen(port, () => {
    console.log(`API Gateway listening on port ${port}`);
});
