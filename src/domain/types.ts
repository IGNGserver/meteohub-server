export type UUID = string;

export interface HubLocation {
  id: UUID;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string | null;
  admin1: string | null;
  admin2: string | null;
  alias: string | null;
  sortOrder: number;
  analysisEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncVersion: number;
  fallbackProvider: string;
  rawRetentionDays: number;
}

export interface Device {
  id: UUID;
  name: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  syncCursor: number;
}

export interface PairingCode {
  id: UUID;
  code: string;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

export interface SyncChange {
  version: number;
  entity: "hub_location";
  entityId: UUID;
  operation: "upsert" | "delete";
  payload?: HubLocation | undefined;
  occurredAt: string;
}

export interface Settings {
  calibrationEnabled: boolean;
  ingestionEnabled: boolean;
  rawRetentionDays: number;
  serverName: string;
}

export interface ForecastValue {
  modelId: string;
  runAt: string;
  validAt: string;
  leadHours: number;
  variable: string;
  value: number | null;
  sourceVersion: string;
  metadata?: Record<string, unknown>;
}

export interface FusedPoint {
  validAt: string;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  weatherCode: number | null;
  cloudCoverPct: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  spread: Record<string, number>;
  confidence: number;
  freshness: string;
}

export interface FusedForecast {
  locationId: UUID;
  generatedAt: string;
  timezone: string;
  current: FusedPoint | null;
  hourly: FusedPoint[];
  daily: Array<{
    date: string;
    temperatureMaxC: number | null;
    temperatureMinC: number | null;
    precipitationMm: number | null;
    precipitationProbabilityMax: number | null;
    weatherCode: number | null;
    confidence: number;
  }>;
  contributingModels: string[];
}
