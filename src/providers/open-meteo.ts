import type { AppConfig } from "../config/config.js";
import type { HubLocation } from "../domain/types.js";
import type { ModelDefinition } from "../domain/models.js";
import { ProviderError, type ProviderForecast, type ProviderObservation, type ProviderPoint, type WeatherProvider } from "./provider.js";

const HOURLY = ["temperature_2m", "apparent_temperature", "precipitation", "precipitation_probability", "wind_speed_10m", "wind_direction_10m", "weather_code", "cloud_cover", "relative_humidity_2m", "surface_pressure"];

export class OpenMeteoProvider implements WeatherProvider {
  readonly id = "open-meteo";
  constructor(private readonly config: AppConfig, private readonly fetchImpl: typeof fetch = fetch) {}
  async fetchForecast(location: HubLocation, model: ModelDefinition, signal?: AbortSignal): Promise<ProviderForecast> {
    const url = new URL("/v1/forecast", this.config.OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", String(location.latitude)); url.searchParams.set("longitude", String(location.longitude));
    url.searchParams.set("timezone", "UTC"); url.searchParams.set("models", model.id); url.searchParams.set("forecast_days", "16"); url.searchParams.set("hourly", HOURLY.join(",")); url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m,surface_pressure");
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.config.OPEN_METEO_TIMEOUT_MS);
    const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    try {
      const response = await this.fetchImpl(url, { signal: combinedSignal, headers: { accept: "application/json" } });
      if (!response.ok) throw new ProviderError(`Open-Meteo HTTP ${response.status}`, response.status === 429 || response.status >= 500, response.status);
      const payload = await response.json() as Record<string, unknown>;
      const hourly = asRecord(payload.hourly); const times = asArray(hourly.time).map((value) => String(value));
      if (times.length === 0) throw new ProviderError("Open-Meteo response has no hourly time axis", false);
      const points: ProviderPoint[] = times.map((validAt, index) => {
        const variables: Record<string, number | null> = {};
        for (const variable of HOURLY) { const values = asArray(hourly[variable]); const value = values[index]; variables[variable] = typeof value === "number" && Number.isFinite(value) ? value : null; }
        return { validAt: toIso(validAt), variables };
      });
      const fetchedAt = new Date().toISOString();
      const explicitRun = typeof payload.model_run_at === "string" ? payload.model_run_at : undefined;
      return { provider: this.id, modelId: model.id, modelRunAt: explicitRun ? toIso(explicitRun) : floorToUpdate(new Date(), model.updateHours).toISOString(), fetchedAt, sourceVersion: `open-meteo:${String(payload.generationtime_ms ?? "unknown")}`, points };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new ProviderError("Open-Meteo request timed out", true);
      throw new ProviderError(error instanceof Error ? error.message : "Open-Meteo request failed", true);
    } finally { clearTimeout(timeout); }
  }
  async fetchSingleRun(location: HubLocation, model: ModelDefinition, runAt: string, signal?: AbortSignal): Promise<ProviderForecast> {
    const url = new URL("/v1/forecast", this.config.OPEN_METEO_SINGLE_RUNS_BASE_URL);
    this.setCommonParameters(url, location, model);
    url.searchParams.set("run", runAt); url.searchParams.set("forecast_days", "16");
    return this.fetchForecastResponse(url, location, model, signal, runAt);
  }
  async fetchObservations(location: HubLocation, startDate: string, endDate: string, signal?: AbortSignal): Promise<ProviderObservation> {
    const url = new URL("/v1/archive", this.config.OPEN_METEO_ARCHIVE_BASE_URL);
    url.searchParams.set("latitude", String(location.latitude)); url.searchParams.set("longitude", String(location.longitude)); url.searchParams.set("timezone", "UTC"); url.searchParams.set("start_date", startDate); url.searchParams.set("end_date", endDate); url.searchParams.set("hourly", HOURLY.join(","));
    const payload = await this.fetchJson(url, signal);
    const points = parsePoints(asRecord(payload.hourly));
    return { provider: this.id, sourceVersion: `open-meteo-archive:${String(payload.generationtime_ms ?? "unknown")}`, points };
  }
  private setCommonParameters(url: URL, location: HubLocation, model: ModelDefinition): void { url.searchParams.set("latitude", String(location.latitude)); url.searchParams.set("longitude", String(location.longitude)); url.searchParams.set("timezone", "UTC"); url.searchParams.set("models", model.id); url.searchParams.set("hourly", HOURLY.join(",")); url.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m,surface_pressure"); }
  private async fetchForecastResponse(url: URL, _location: HubLocation, model: ModelDefinition, signal: AbortSignal | undefined, explicitRun?: string): Promise<ProviderForecast> { const payload = await this.fetchJson(url, signal); const points = parsePoints(asRecord(payload.hourly)); if (points.length === 0) throw new ProviderError("Open-Meteo response has no hourly time axis", false); const fetchedAt = new Date().toISOString(); const modelRunAt = explicitRun ? toIso(explicitRun) : typeof payload.model_run_at === "string" ? toIso(payload.model_run_at) : floorToUpdate(new Date(), model.updateHours).toISOString(); return { provider: this.id, modelId: model.id, modelRunAt, fetchedAt, sourceVersion: `open-meteo:${String(payload.generationtime_ms ?? "unknown")}`, points }; }
  private async fetchJson(url: URL, signal?: AbortSignal): Promise<Record<string, unknown>> { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.config.OPEN_METEO_TIMEOUT_MS); const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal; try { const response = await this.fetchImpl(url, { signal: combinedSignal, headers: { accept: "application/json" } }); if (!response.ok) throw new ProviderError(`Open-Meteo HTTP ${response.status}`, response.status === 429 || response.status >= 500, response.status); return await response.json() as Record<string, unknown>; } catch (error) { if (error instanceof ProviderError) throw error; if (error instanceof Error && error.name === "AbortError") throw new ProviderError("Open-Meteo request timed out", true); throw new ProviderError(error instanceof Error ? error.message : "Open-Meteo request failed", true); } finally { clearTimeout(timeout); } }
}

export async function withRetry<T>(task: () => Promise<T>, attempts = 3, waitMs = 200): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await task(); } catch (error) { lastError = error; if (!(error instanceof ProviderError) || !error.retryable || attempt === attempts) throw error; await new Promise((resolve) => setTimeout(resolve, waitMs * attempt)); }
  }
  throw lastError instanceof Error ? lastError : new Error("retry failed");
}

function asRecord(value: unknown): Record<string, unknown> { return value !== null && typeof value === "object" ? value as Record<string, unknown> : {}; }
function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function toIso(value: string): string { const date = new Date(value); if (Number.isNaN(date.getTime())) throw new ProviderError(`Invalid provider timestamp: ${value}`, false); return date.toISOString(); }
function floorToUpdate(date: Date, hours: number): Date { const ms = hours * 3_600_000; return new Date(Math.floor(date.getTime() / ms) * ms); }
function parsePoints(hourly: Record<string, unknown>): ProviderPoint[] { const times = asArray(hourly.time).map((value) => String(value)); return times.map((validAt, index) => { const variables: Record<string, number | null> = {}; for (const variable of HOURLY) { const values = asArray(hourly[variable]); const value = values[index]; variables[variable] = typeof value === "number" && Number.isFinite(value) ? value : null; } return { validAt: toIso(validAt), variables }; }); }
