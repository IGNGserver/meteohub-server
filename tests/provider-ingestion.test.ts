import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/config.js";
import { OpenMeteoProvider, withRetry } from "../src/providers/open-meteo.js";
import { ProviderError, type ProviderForecast, type WeatherProvider } from "../src/providers/provider.js";
import { MODEL_REGISTRY } from "../src/domain/models.js";
import { IngestionCoordinator } from "../src/ingestion/ingestion.js";
import { MemoryStore } from "../src/storage/store.js";
import type { HubLocation } from "../src/domain/types.js";

const location: HubLocation = { id: "00000000-0000-0000-0000-000000000001", name: "Test", latitude: 31, longitude: 121, timezone: "Asia/Shanghai", countryCode: "CN", admin1: null, admin2: null, alias: null, sortOrder: 0, analysisEnabled: true, createdAt: "2026-08-02T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z", deletedAt: null, syncVersion: 1, fallbackProvider: "open-meteo", rawRetentionDays: 365 };

describe("Open-Meteo adapter", () => {
  it("normalizes the provider response and preserves an explicit model run time", async () => {
    const config = loadConfig({ NODE_ENV: "test", HUB_ACCESS_KEY: "test-hub-key" });
    const provider = new OpenMeteoProvider(config, async () => new Response(JSON.stringify({ model_run_at: "2026-08-03T00:00:00Z", generationtime_ms: 1, hourly: { time: ["2026-08-03T06:00:00Z"], temperature_2m: [28], apparent_temperature: [30], precipitation: [0.2], precipitation_probability: [70], wind_speed_10m: [12], wind_direction_10m: [350], weather_code: [61], cloud_cover: [80], relative_humidity_2m: [80], surface_pressure: [1005] } }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await provider.fetchForecast(location, MODEL_REGISTRY[0]!);
    expect(result.modelRunAt).toBe("2026-08-03T00:00:00.000Z");
    expect(result.points[0]?.variables.temperature_2m).toBe(28);
    const single = await provider.fetchSingleRun!(location, MODEL_REGISTRY[0]!, "2026-08-03T00:00:00Z");
    const observations = await provider.fetchObservations!(location, "2026-08-03", "2026-08-03");
    expect(single.modelRunAt).toBe("2026-08-03T00:00:00.000Z");
    expect(observations.points[0]?.variables.precipitation).toBe(0.2);
  });

  it("retries temporary provider failure but not permanent failure", async () => {
    let attempts = 0;
    await expect(withRetry(async () => { attempts += 1; if (attempts < 3) throw new ProviderError("busy", true, 503); return "ok"; }, 3, 1)).resolves.toBe("ok");
    expect(attempts).toBe(3);
    await expect(withRetry(async () => { throw new ProviderError("bad request", false, 400); }, 3, 1)).rejects.toThrow("bad request");
  });
});

class FixedProvider implements WeatherProvider {
  readonly id = "fixed"; calls = 0;
  async fetchForecast(_location: HubLocation, model: typeof MODEL_REGISTRY[number]): Promise<ProviderForecast> { this.calls += 1; return { provider: this.id, modelId: model.id, modelRunAt: "2026-08-03T00:00:00.000Z", fetchedAt: "2026-08-03T00:01:00.000Z", sourceVersion: "fixture-v1", points: [{ validAt: "2026-08-03T06:00:00.000Z", variables: { temperature_2m: 25, apparent_temperature: 25, precipitation: 0, precipitation_probability: 10, wind_speed_10m: 4, wind_direction_10m: 350, weather_code: 1, cloud_cover: 20, relative_humidity_2m: 50, surface_pressure: 1010 } }] }; }
}

describe("idempotent ingestion and time semantics", () => {
  it("does not treat fetch time as run time and skips concurrent duplicate jobs", async () => {
    const store = new MemoryStore(); const provider = new FixedProvider(); const coordinator = new IngestionCoordinator(store, provider); const fixedLocation = { ...location, id: "00000000-0000-0000-0000-000000000002" }; const now = new Date("2026-08-03T00:00:00.000Z");
    const [first, second] = await Promise.all([coordinator.runLocation(fixedLocation, now), coordinator.runLocation(fixedLocation, now)]);
    expect([first.status, second.status].sort()).toEqual(["completed", "skipped"]);
    expect(provider.calls).toBe(MODEL_REGISTRY.length);
    const values = await store.getEvolution(fixedLocation.id, "temperature_2m");
    expect(values[0]).toMatchObject({ runAt: "2026-08-03T00:00:00.000Z", validAt: "2026-08-03T06:00:00.000Z", leadHours: 6 });
  });
});
