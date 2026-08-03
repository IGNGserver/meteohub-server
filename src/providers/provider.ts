import type { HubLocation } from "../domain/types.js";
import type { ModelDefinition } from "../domain/models.js";

export interface ProviderPoint { validAt: string; variables: Record<string, number | null>; }

export interface ProviderForecast {
  provider: string;
  modelId: string;
  modelRunAt: string;
  fetchedAt: string;
  sourceVersion: string;
  points: ProviderPoint[];
}

export interface ProviderObservation { provider: string; sourceVersion: string; points: ProviderPoint[]; }

export interface WeatherProvider {
  readonly id: string;
  fetchForecast(location: HubLocation, model: ModelDefinition, signal?: AbortSignal): Promise<ProviderForecast>;
  fetchSingleRun?(location: HubLocation, model: ModelDefinition, runAt: string, signal?: AbortSignal): Promise<ProviderForecast>;
  fetchObservations?(location: HubLocation, startDate: string, endDate: string, signal?: AbortSignal): Promise<ProviderObservation>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly statusCode?: number) { super(message); this.name = "ProviderError"; }
}
