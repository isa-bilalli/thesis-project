import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import app from "../../apps/access-service/app.js";

let server: http.Server;
let baseUrl: string;

before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("Access service exposes a liveness endpoint", async () => {
  const response = await fetch(`${baseUrl}/health/live`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "access",
    status: "alive",
  });
});

test("Access service mounts all Access-owned route groups", async () => {
  const protectedPaths = [
    "/api/auth/me",
    "/api/platform/auth/me",
    "/api/platform/tenants",
    "/api/users",
    "/api/tenant/locations",
  ];

  for (const path of protectedPaths) {
    const response = await fetch(`${baseUrl}${path}`);

    assert.equal(response.status, 401, path);
    assert.deepEqual(await response.json(), {
      error: {
        message: "Authentication required",
      },
    });
  }
});
