import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import { sign } from "jsonwebtoken";
import { env } from "../../src/config/env.js";
import { requireTenantAuth } from "../../src/shared/middleware/require-tenant-auth.js";

let server: http.Server;
let baseUrl: string;

before(async () => {
  const app = express();

  app.get("/protected", requireTenantAuth, (request, response) => {
    response.json({ auth: request.auth });
  });

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

test("tenant JWT is verified locally without a database lookup", async () => {
  const token = sign(
    {
      actorType: "TENANT",
      tenantId: 7,
      authVersion: 3,
      roles: ["SALESPERSON"],
      permissions: ["inventory.read"],
    },
    env.auth.tenantAccessSecret,
    {
      subject: "42",
      expiresIn: 60,
    },
  );

  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    auth: {
      userId: 42,
      tenantId: 7,
      authVersion: 3,
      roles: ["SALESPERSON"],
      permissions: ["inventory.read"],
    },
  });
});
