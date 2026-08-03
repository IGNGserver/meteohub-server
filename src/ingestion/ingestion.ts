import type { HubLocation, FusedForecast, FusedPoint } from "../domain/types.js";
import { MODEL_REGISTRY } from "../domain/models.js";
import { fuseSamples, type FusionVariable } from "../domain/fusion.js";
import type { Store } from "../storage/store.js";
import { withRetry } from "../providers/open-meteo.js";
import type { WeatherProvider, ProviderForecast } from "../providers/provider.js";

const VARIABLES: readonly FusionVariable[] = ["temperature_2m", "apparent_temperature", "precipitation", "precipitation_probability", "wind_speed_10m", "wind_direction_10m", "weather_code", "cloud_cover", "relative_humidity_2m", "surface_pressure"];

export class IngestionCoordinator {
  private readonly running = new Set<string>();
  constructor(private readonly store: Store, private readonly provider: WeatherProvider) {}
  async runLocation(location: HubLocation, now = new Date()): Promise<{ status: "completed" | "skipped"; modelCount: number }> {
    if (this.running.has(location.id)) return { status: "skipped", modelCount: 0 };
    this.running.add(location.id);
    try {
      const forecasts: ProviderForecast[] = [];
      for (const model of MODEL_REGISTRY.filter((candidate) => candidate.enabled)) {
        try { forecasts.push(await withRetry(() => this.provider.fetchForecast(location, model), 3, 150)); } catch { /* one model may be unavailable; fusion remains useful */ }
      }
      if (forecasts.length === 0) throw new Error("NO_PROVIDER_DATA");
      const pointTimes = [...new Set(forecasts.flatMap((forecast) => forecast.points.map((point) => point.validAt)))].sort();
      const hourly = pointTimes.map((validAt) => fusePoint(forecasts, location, validAt, now));
      const forecast: FusedForecast = { locationId: location.id, generatedAt: now.toISOString(), timezone: location.timezone, current: hourly[0] ?? null, hourly, daily: makeDaily(hourly, location.timezone), contributingModels: forecasts.map((item) => item.modelId) };
      const values = forecasts.flatMap((item) => item.points.flatMap((point) => VARIABLES.map((variable) => ({ modelId: item.modelId, runAt: item.modelRunAt, validAt: point.validAt, leadHours: Math.max(0, Math.round((new Date(point.validAt).getTime() - new Date(item.modelRunAt).getTime()) / 3_600_000)), variable, value: point.variables[variable] ?? null, sourceVersion: item.sourceVersion, metadata: { provider: item.provider, fetchedAt: item.fetchedAt } }))));
      await this.store.saveForecast(location.id, forecast, values);
      return { status: "completed", modelCount: forecasts.length };
    } finally { this.running.delete(location.id); }
  }
}

function fusePoint(forecasts: readonly ProviderForecast[], location: HubLocation, validAt: string, now: Date): FusedPoint {
  const get = (variable: FusionVariable) => fuseSamples(forecasts.map((forecast) => ({ modelId: forecast.modelId, value: forecast.points.find((point) => point.validAt === validAt)?.variables[variable] ?? null })), { lat: location.latitude, lon: location.longitude, leadHours: Math.max(0, Math.round((new Date(validAt).getTime() - now.getTime()) / 3_600_000)), variable });
  const temperature = get("temperature_2m"); const apparent = get("apparent_temperature"); const precipitation = get("precipitation"); const probability = get("precipitation_probability"); const windSpeed = get("wind_speed_10m"); const windDirection = get("wind_direction_10m"); const code = get("weather_code"); const cloud = get("cloud_cover"); const humidity = get("relative_humidity_2m"); const pressure = get("surface_pressure");
  const freshness = new Date(validAt).getTime() < now.getTime() ? "historical" : "forecast";
  return { validAt, temperatureC: temperature.value, apparentTemperatureC: apparent.value, precipitationMm: precipitation.value, precipitationProbability: probability.value, windSpeedKmh: windSpeed.value, windDirectionDeg: windDirection.value, weatherCode: code.value === null ? null : Math.round(code.value), cloudCoverPct: cloud.value, humidityPct: humidity.value, pressureHpa: pressure.value, spread: { temperatureC: temperature.spread, precipitationMm: precipitation.spread, windSpeedKmh: windSpeed.spread }, confidence: Math.min(temperature.confidence, precipitation.confidence || temperature.confidence), freshness };
}

function makeDaily(hourly: readonly FusedPoint[], timezone: string): FusedForecast["daily"] {
  const byDate = new Map<string, FusedPoint[]>();
  for (const point of hourly) { const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(point.validAt)); const list = byDate.get(date) ?? []; list.push(point); byDate.set(date, list); }
  return [...byDate.entries()].map(([date, points]) => { const temps = points.flatMap((point) => point.temperatureC === null ? [] : [point.temperatureC]); const precipitation = points.flatMap((point) => point.precipitationMm === null ? [] : [point.precipitationMm]); const probabilities = points.flatMap((point) => point.precipitationProbability === null ? [] : [point.precipitationProbability]); const codes = new Map<number, number>(); for (const point of points) if (point.weatherCode !== null) codes.set(point.weatherCode, (codes.get(point.weatherCode) ?? 0) + 1); return { date, temperatureMaxC: temps.length ? Math.max(...temps) : null, temperatureMinC: temps.length ? Math.min(...temps) : null, precipitationMm: precipitation.length ? precipitation.reduce((sum, value) => sum + value, 0) : null, precipitationProbabilityMax: probabilities.length ? Math.max(...probabilities) : null, weatherCode: codes.size ? [...codes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null, confidence: points.length ? points.reduce((sum, point) => sum + point.confidence, 0) / points.length : 0 }; });
}
