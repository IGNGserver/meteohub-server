import { describe, expect, it } from "vitest";
import { buildServer } from "../../src/api/server.js";
import { loadConfig } from "../../src/config/config.js";
import { MemoryStore } from "../../src/storage/store.js";

describe("API integration smoke", () => {
  it("serves health and version without a database connection", async () => {
    const app = await buildServer(loadConfig({ NODE_ENV: "test", HUB_ACCESS_KEY: "integration-hub-key" }), new MemoryStore());
    try {
      const health = await app.inject({ method: "GET", url: "/api/v1/health" });
      const version = await app.inject({ method: "GET", url: "/api/v1/version" });
      expect(health.statusCode).toBe(200); expect(health.json().status).toBe("ok");
      expect(version.statusCode).toBe(200); expect(version.json().apiVersion).toBe("v1");
    } finally { await app.close(); }
  });
});
