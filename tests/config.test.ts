import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/config.js";

describe("production configuration", () => {
  it("parses explicit boolean environment values instead of JavaScript truthiness", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://meteohub:test@localhost:5432/meteohub",
      DATABASE_SSL: "false",
      HUB_ACCESS_KEY: "production-hub-key-100728",
      CALIBRATION_ENABLED: "false",
      INGESTION_ENABLED: "true",
    });

    expect(config.DATABASE_SSL).toBe(false);
    expect(config.CALIBRATION_ENABLED).toBe(false);
    expect(config.INGESTION_ENABLED).toBe(true);
  });

  const base = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://meteohub:strong-password@postgres:5432/meteohub",
    HUB_ACCESS_KEY: "production-hub-key-100728",
  };

  it("requires a database and non-placeholder secret", () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: undefined })).toThrow("DATABASE_URL");
    expect(() => loadConfig({ ...base, HUB_ACCESS_KEY: "development-only-change-me-please" })).toThrow("HUB_ACCESS_KEY");
  });

  it("rejects debug logging in production", () => {
    expect(() => loadConfig({ ...base, LOG_LEVEL: "debug" })).toThrow("Debug logging");
  });
});
