import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/config.js";

describe("production configuration", () => {
  const base = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://meteohub:strong-password@postgres:5432/meteohub",
    TOKEN_PEPPER: "a-production-secret-that-is-not-a-placeholder",
  };

  it("requires a database and non-placeholder secret", () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: undefined })).toThrow("DATABASE_URL");
    expect(() => loadConfig({ ...base, TOKEN_PEPPER: "development-only-change-me-please" })).toThrow("TOKEN_PEPPER");
  });

  it("rejects debug logging in production", () => {
    expect(() => loadConfig({ ...base, LOG_LEVEL: "debug" })).toThrow("Debug logging");
  });
});
