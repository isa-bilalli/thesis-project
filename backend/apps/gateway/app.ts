import http from "node:http";
import https from "node:https";
import express, {
    type Express,
    type NextFunction,
    type Request,
    type RequestHandler,
    type Response,
} from "express";

function createMonolithProxy(monolithBaseUrl: URL): RequestHandler {
    return (
        request: Request,
        response: Response,
        next: NextFunction,
    ): void => {
        const targetUrl = new URL(request.originalUrl, monolithBaseUrl);
        const forwardedFor = request.socket.remoteAddress;
        const headers: http.OutgoingHttpHeaders = {
            ...request.headers,
            host: targetUrl.host,
            "x-forwarded-host": request.headers.host,
            "x-forwarded-proto": request.protocol,
        };

        if (forwardedFor) {
            headers["x-forwarded-for"] = request.headers["x-forwarded-for"]
                ? `${request.headers["x-forwarded-for"]}, ${forwardedFor}`
                : forwardedFor;
        }

        const transport = targetUrl.protocol === "https:" ? https : http;
        const proxyRequest = transport.request(
            targetUrl,
            {
                method: request.method,
                headers,
            },
            (proxyResponse) => {
                response.status(proxyResponse.statusCode ?? 502);

                for (const [name, value] of Object.entries(proxyResponse.headers)) {
                    if (value !== undefined) {
                        response.setHeader(name, value);
                    }
                }

                proxyResponse.pipe(response);
            },
        );

        proxyRequest.on("error", (error) => {
            if (response.headersSent) {
                response.destroy(error);
                return;
            }

            next(error);
        });

        request.on("aborted", () => proxyRequest.destroy());
        request.pipe(proxyRequest);
    };
}

export function createGatewayApp(
    monolithUrl = process.env.MONOLITH_URL ?? "http://127.0.0.1:3001",
    accessServiceUrl =
        process.env.ACCESS_SERVICE_URL ?? "http://127.0.0.1:3002",
    inventoryServiceUrl =
        process.env.INVENTORY_SERVICE_URL ?? "http://127.0.0.1:3005",
    crmServiceUrl = process.env.CRM_SERVICE_URL ?? "http://127.0.0.1:3003",
): Express {
    const app = express();
    const monolithBaseUrl = new URL(monolithUrl);
    const accessServiceBaseUrl = new URL(accessServiceUrl);
    const inventoryServiceBaseUrl = new URL(inventoryServiceUrl);
    const crmServiceBaseUrl = new URL(crmServiceUrl);

    app.get("/health", (_request, response) => {
        response.status(200).json({
            service: "gateway",
            status: "ok",
        });
    });

    const accessProxy = createMonolithProxy(accessServiceBaseUrl);
    const inventoryProxy = createMonolithProxy(inventoryServiceBaseUrl);
    const crmProxy = createMonolithProxy(crmServiceBaseUrl);

    app.use("/api/auth", accessProxy);
    app.use("/api/platform", accessProxy);
    app.use("/api/users", accessProxy);
    app.use("/api/tenant/locations", accessProxy);
    app.use("/api/tenant/vehicles", inventoryProxy);
    app.use("/api/tenant/reservations", inventoryProxy);
    app.use("/api/tenant/customers", crmProxy);
    app.use("/api/tenant/leads", crmProxy);
    app.use("/api/tenant/lead-activities", crmProxy);
    app.use("/api/tenant/test-drives", crmProxy);
    app.use("/api", createMonolithProxy(monolithBaseUrl));

    app.use(
        (
            error: unknown,
            _request: Request,
            response: Response,
            _next: NextFunction,
        ) => {
            console.error("Gateway proxy error", error);
            response.status(502).json({
                error: {
                    message: "The backend service is unavailable",
                },
            });
        },
    );

    return app;
}

const app = createGatewayApp();

export default app;
