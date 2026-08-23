import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createGatewayApp } from "../../apps/gateway/app.js";

let monolithServer: http.Server;
let accessServer: http.Server;
let inventoryServer: http.Server;
let crmServer: http.Server;
let gatewayServer: http.Server;
let gatewayBaseUrl: string;

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

async function close(server: http.Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

before(async () => {
  monolithServer = http.createServer((request, response) => {
    const body: Buffer[] = [];

    request.on("data", (chunk: Buffer) => body.push(chunk));
    request.on("end", () => {
      response.writeHead(201, {
        "content-type": "application/json",
        "set-cookie": ["refreshToken=updated; Path=/; HttpOnly"],
      });
      response.end(
        JSON.stringify({
          method: request.method,
          url: request.url,
          authorization: request.headers.authorization,
          cookie: request.headers.cookie,
          body: Buffer.concat(body).toString("utf8"),
        }),
      );
    });
  });

  const monolithPort = await listen(monolithServer);
  accessServer = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        service: "access",
        url: request.url,
      }),
    );
  });
  const accessPort = await listen(accessServer);
  const createServiceServer = (service: string): http.Server =>
    http.createServer((request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ service, url: request.url }));
    });
  inventoryServer = createServiceServer("inventory");
  crmServer = createServiceServer("crm");
  const inventoryPort = await listen(inventoryServer);
  const crmPort = await listen(crmServer);
  const app = createGatewayApp(
    `http://127.0.0.1:${monolithPort}`,
    `http://127.0.0.1:${accessPort}`,
    `http://127.0.0.1:${inventoryPort}`,
    `http://127.0.0.1:${crmPort}`,
  );
  gatewayServer = http.createServer(app);
  const gatewayPort = await listen(gatewayServer);
  gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
});

after(async () => {
  await Promise.all([
    close(gatewayServer),
    close(monolithServer),
    close(accessServer),
    close(inventoryServer),
    close(crmServer),
  ]);
});

test("gateway health is handled without proxying", async () => {
  const response = await fetch(`${gatewayBaseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "gateway",
    status: "ok",
  });
});

test("gateway transparently proxies API requests to the monolith", async () => {
  const response = await fetch(`${gatewayBaseUrl}/api/example?filter=active`, {
    method: "POST",
    headers: {
      authorization: "Bearer access-token",
      cookie: "refreshToken=original",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "vehicle" }),
  });

  assert.equal(response.status, 201);
  assert.match(
    response.headers.get("set-cookie") ?? "",
    /refreshToken=updated/,
  );
  assert.deepEqual(await response.json(), {
    method: "POST",
    url: "/api/example?filter=active",
    authorization: "Bearer access-token",
    cookie: "refreshToken=original",
    body: JSON.stringify({ name: "vehicle" }),
  });
});

test("gateway routes Access-owned paths to the Access service", async () => {
  const accessPaths = [
    "/api/auth/me",
    "/api/platform/auth/me",
    "/api/platform/tenants",
    "/api/users",
    "/api/tenant/locations",
  ];

  for (const path of accessPaths) {
    const response = await fetch(`${gatewayBaseUrl}${path}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      service: "access",
      url: path,
    });
  }
});

test("gateway routes Inventory-owned paths to Inventory", async () => {
  for (const path of [
    "/api/tenant/vehicles",
    "/api/tenant/vehicles/42/reservation",
    "/api/tenant/reservations",
  ]) {
    const response = await fetch(`${gatewayBaseUrl}${path}`);
    assert.deepEqual(await response.json(), { service: "inventory", url: path });
  }
});

test("gateway routes CRM-owned paths to CRM", async () => {
  for (const path of [
    "/api/tenant/customers",
    "/api/tenant/leads",
    "/api/tenant/lead-activities",
    "/api/tenant/test-drives",
  ]) {
    const response = await fetch(`${gatewayBaseUrl}${path}`);
    assert.deepEqual(await response.json(), { service: "crm", url: path });
  }
});
