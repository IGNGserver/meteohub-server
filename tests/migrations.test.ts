import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("database migration", () => {
  it("contains every required durable entity and is rerunnable", () => {
    const sql = readFileSync(new URL("../drizzle/0000_initial.sql", import.meta.url), "utf8");
    for (const table of ["settings", "devices", "pairing_codes", "hub_locations", "sync_changes", "forecast_runs", "forecast_values", "observations", "verification_scores", "calibration_parameters", "fused_forecasts", "ingestion_jobs", "schema_migrations"]) expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
    expect(sql).toContain("ON CONFLICT DO NOTHING");
    expect(sql).toContain("gen_random_uuid()");
  });
});
