import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/api/server.js";
import { loadConfig } from "../src/config/config.js";
import { MemoryStore } from "../src/storage/store.js";

const config = loadConfig({ NODE_ENV: "test", TOKEN_PEPPER: "test-pepper-which-is-long", APP_VERSION: "0.1.0" });
const servers: Array<{ close: () => Promise<unknown> }> = [];
afterEach(async () => { for (const server of servers.splice(0)) await server.close(); });

describe("HTTP contract", () => {
  it("requires auth, supports pairing, location CRUD and tombstone sync", async () => {
    const app = await buildServer(config, new MemoryStore()); servers.push(app);
    expect((await app.inject({ method: "GET", url: "/api/v1/locations" })).statusCode).toBe(401);
    const pairingResponse = await app.inject({ method: "POST", url: "/api/v1/pairing-codes" }); expect(pairingResponse.statusCode).toBe(201); const pairing = pairingResponse.json() as { code: string };
    const pairResponse = await app.inject({ method: "POST", url: "/api/v1/pair", payload: { code: pairing.code, deviceName: "Phone" } }); expect(pairResponse.statusCode).toBe(201); const token = pairResponse.json().token as string;
    const headers = { authorization: `Bearer ${token}` };
    const created = await app.inject({ method: "POST", url: "/api/v1/locations", headers, payload: { name: "Shanghai", latitude: 31.23, longitude: 121.47, timezone: "Asia/Shanghai" } }); expect(created.statusCode).toBe(201); const location = created.json();
    const candidates = await app.inject({ method: "GET", url: "/api/v1/locations/candidates?latitude=31.2301&longitude=121.4701&timezone=Asia%2FShanghai&countryCode=CN", headers }); expect(candidates.statusCode).toBe(200); expect(candidates.json()[0].location.id).toBe(location.id);
    expect((await app.inject({ method: "PATCH", url: `/api/v1/locations/${location.id}`, headers, payload: { alias: "Home", expectedVersion: location.syncVersion } })).statusCode).toBe(200);
    expect((await app.inject({ method: "PATCH", url: `/api/v1/locations/${location.id}`, headers, payload: { alias: "stale", expectedVersion: location.syncVersion } })).statusCode).toBe(409);
    expect((await app.inject({ method: "DELETE", url: `/api/v1/locations/${location.id}`, headers })).statusCode).toBe(200);
    const sync = await app.inject({ method: "GET", url: "/api/v1/locations/sync?since=0", headers }); expect(sync.statusCode).toBe(200); expect(sync.json().changes.at(-1).operation).toBe("delete");
    const openapi = await app.inject({ method: "GET", url: "/api/v1/openapi.json" }); expect(openapi.statusCode).toBe(200); expect(openapi.json().paths["/api/v1/locations/{id}/forecast"]).toBeDefined(); expect(openapi.json().paths["/api/v1/locations/candidates"]).toBeDefined();
  });

  it("validates location input and blocks a revoked device", async () => {
    const store = new MemoryStore(); const app = await buildServer(config, store); servers.push(app);
    const pairing = (await app.inject({ method: "POST", url: "/api/v1/pairing-codes" })).json(); const pair = (await app.inject({ method: "POST", url: "/api/v1/pair", payload: { code: pairing.code, deviceName: "Tablet" } })).json(); const headers = { authorization: `Bearer ${pair.token as string}` };
    expect((await app.inject({ method: "POST", url: "/api/v1/locations", headers, payload: { name: "", latitude: 200, longitude: 0, timezone: "" } })).statusCode).toBe(400);
    await store.revokeDevice(pair.device.id as string);
    expect((await app.inject({ method: "GET", url: "/api/v1/locations", headers })).statusCode).toBe(401);
  });
});
