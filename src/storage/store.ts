import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { FusedForecast, HubLocation, Settings, SyncChange, ForecastValue } from "../domain/types.js";

export interface LocationInput {
  name: string; latitude: number; longitude: number; timezone: string;
  countryCode?: string | null | undefined; admin1?: string | null | undefined; admin2?: string | null | undefined;
  alias?: string | null | undefined; sortOrder?: number | undefined; analysisEnabled?: boolean | undefined;
  fallbackProvider?: string | undefined; rawRetentionDays?: number | undefined;
}
export type LocationPatch = { [K in keyof LocationInput]?: LocationInput[K] | undefined };
export type SettingsPatch = { calibrationEnabled?: boolean | undefined; ingestionEnabled?: boolean | undefined; rawRetentionDays?: number | undefined; serverName?: string | undefined };

export interface Store {
  getLocations(includeDeleted?: boolean): Promise<HubLocation[]>;
  getLocation(id: string): Promise<HubLocation | null>;
  createLocation(input: LocationInput): Promise<HubLocation>;
  updateLocation(id: string, patch: LocationPatch, expectedVersion?: number): Promise<HubLocation>;
  deleteLocation(id: string): Promise<HubLocation>;
  getChanges(since: number, limit: number): Promise<{ cursor: number; changes: SyncChange[]; hasMore: boolean }>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: SettingsPatch): Promise<Settings>;
  saveForecast(locationId: string, forecast: FusedForecast, values: ForecastValue[]): Promise<void>;
  getForecast(locationId: string): Promise<FusedForecast | null>;
  getEvolution(locationId: string, variable: string, validAt?: string): Promise<ForecastValue[]>;
  getPerformance(locationId: string): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

function nowIso(): string { return new Date().toISOString(); }

export class MemoryStore implements Store {
  private locations = new Map<string, HubLocation>();
  private changes: SyncChange[] = [];
  private version = 0;
  private settings: Settings = { calibrationEnabled: true, ingestionEnabled: false, rawRetentionDays: 365, serverName: "MeteoHub" };
  private forecasts = new Map<string, FusedForecast>();
  private forecastValues = new Map<string, ForecastValue[]>();

  async getLocations(includeDeleted = false): Promise<HubLocation[]> {
    return [...this.locations.values()].filter((location) => includeDeleted || location.deletedAt === null).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  }
  async getLocation(id: string): Promise<HubLocation | null> { return this.locations.get(id) ?? null; }
  async createLocation(input: LocationInput): Promise<HubLocation> {
    const timestamp = nowIso(); const id = randomUUID(); const syncVersion = ++this.version;
    const location: HubLocation = { id, name: input.name, latitude: input.latitude, longitude: input.longitude, timezone: input.timezone, countryCode: input.countryCode ?? null, admin1: input.admin1 ?? null, admin2: input.admin2 ?? null, alias: input.alias ?? null, sortOrder: input.sortOrder ?? this.locations.size, analysisEnabled: input.analysisEnabled ?? true, createdAt: timestamp, updatedAt: timestamp, deletedAt: null, syncVersion, fallbackProvider: input.fallbackProvider ?? "open-meteo", rawRetentionDays: input.rawRetentionDays ?? this.settings.rawRetentionDays };
    this.locations.set(id, location); this.recordChange("upsert", location); return location;
  }
  async updateLocation(id: string, patch: LocationPatch, expectedVersion?: number): Promise<HubLocation> {
    const current = this.locations.get(id); if (!current || current.deletedAt !== null) throw new Error("LOCATION_NOT_FOUND");
    if (expectedVersion !== undefined && expectedVersion !== current.syncVersion) throw new Error("SYNC_CONFLICT");
    const next: HubLocation = { ...current, ...(patch.name === undefined ? {} : { name: patch.name }), ...(patch.latitude === undefined ? {} : { latitude: patch.latitude }), ...(patch.longitude === undefined ? {} : { longitude: patch.longitude }), ...(patch.timezone === undefined ? {} : { timezone: patch.timezone }), ...(patch.countryCode === undefined ? {} : { countryCode: patch.countryCode }), ...(patch.admin1 === undefined ? {} : { admin1: patch.admin1 }), ...(patch.admin2 === undefined ? {} : { admin2: patch.admin2 }), ...(patch.alias === undefined ? {} : { alias: patch.alias }), ...(patch.sortOrder === undefined ? {} : { sortOrder: patch.sortOrder }), ...(patch.analysisEnabled === undefined ? {} : { analysisEnabled: patch.analysisEnabled }), ...(patch.fallbackProvider === undefined ? {} : { fallbackProvider: patch.fallbackProvider }), ...(patch.rawRetentionDays === undefined ? {} : { rawRetentionDays: patch.rawRetentionDays }), updatedAt: nowIso(), syncVersion: ++this.version };
    this.locations.set(id, next); this.recordChange("upsert", next); return next;
  }
  async deleteLocation(id: string): Promise<HubLocation> {
    const current = this.locations.get(id); if (!current || current.deletedAt !== null) throw new Error("LOCATION_NOT_FOUND");
    const next: HubLocation = { ...current, deletedAt: nowIso(), updatedAt: nowIso(), syncVersion: ++this.version };
    this.locations.set(id, next); this.recordChange("delete", next); return next;
  }
  async getChanges(since: number, limit: number): Promise<{ cursor: number; changes: SyncChange[]; hasMore: boolean }> {
    const changes = this.changes.filter((change) => change.version > since).slice(0, limit);
    return { cursor: changes.at(-1)?.version ?? since, changes, hasMore: this.changes.some((change) => change.version > (changes.at(-1)?.version ?? since)) };
  }
  async getSettings(): Promise<Settings> { return { ...this.settings }; }
  async updateSettings(patch: SettingsPatch): Promise<Settings> { this.settings = { calibrationEnabled: patch.calibrationEnabled ?? this.settings.calibrationEnabled, ingestionEnabled: patch.ingestionEnabled ?? this.settings.ingestionEnabled, rawRetentionDays: patch.rawRetentionDays ?? this.settings.rawRetentionDays, serverName: patch.serverName ?? this.settings.serverName }; return { ...this.settings }; }
  async saveForecast(locationId: string, forecast: FusedForecast, values: ForecastValue[]): Promise<void> { this.forecasts.set(locationId, forecast); this.forecastValues.set(locationId, values); }
  async getForecast(locationId: string): Promise<FusedForecast | null> { return this.forecasts.get(locationId) ?? null; }
  async getEvolution(locationId: string, variable: string, validAt?: string): Promise<ForecastValue[]> { return (this.forecastValues.get(locationId) ?? []).filter((value) => value.variable === variable && (validAt === undefined || value.validAt === validAt)); }
  async getPerformance(locationId: string): Promise<Record<string, unknown>> { return { locationId, sampleCount: 0, models: [], calibration: "cold-start" }; }
  async close(): Promise<void> {}
  private recordChange(operation: SyncChange["operation"], location: HubLocation): void { this.changes.push({ version: location.syncVersion, entity: "hub_location", entityId: location.id, operation, payload: operation === "upsert" ? location : undefined, occurredAt: location.updatedAt }); }
}

type PgRow = Record<string, unknown>;

export class PostgresStore implements Store {
  private readonly pool: Pool;
  constructor(connectionString: string, ssl: boolean) { this.pool = new Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: true } : false }); }
  async getLocations(includeDeleted = false): Promise<HubLocation[]> { const result = await this.pool.query<PgRow>(`SELECT * FROM hub_locations ${includeDeleted ? "" : "WHERE deleted_at IS NULL"} ORDER BY sort_order, created_at`); return result.rows.map(locationFromRow); }
  async getLocation(id: string): Promise<HubLocation | null> { const result = await this.pool.query<PgRow>("SELECT * FROM hub_locations WHERE id = $1", [id]); return result.rows[0] ? locationFromRow(result.rows[0]) : null; }
  async createLocation(input: LocationInput): Promise<HubLocation> { const client = await this.pool.connect(); try { await client.query("BEGIN"); const version = await nextVersion(client); const result = await client.query<PgRow>(`INSERT INTO hub_locations (name, latitude, longitude, timezone, country_code, admin1, admin2, alias, sort_order, analysis_enabled, sync_version, fallback_provider, raw_retention_days) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [input.name,input.latitude,input.longitude,input.timezone,input.countryCode ?? null,input.admin1 ?? null,input.admin2 ?? null,input.alias ?? null,input.sortOrder ?? 0,input.analysisEnabled ?? true,version,input.fallbackProvider ?? "open-meteo",input.rawRetentionDays ?? 365]); const location = locationFromRow(result.rows[0] as PgRow); await insertChange(client, version, "upsert", location); await client.query("COMMIT"); return location; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
  async updateLocation(id: string, patch: LocationPatch, expectedVersion?: number): Promise<HubLocation> { const current = await this.getLocation(id); if (!current || current.deletedAt !== null) throw new Error("LOCATION_NOT_FOUND"); if (expectedVersion !== undefined && current.syncVersion !== expectedVersion) throw new Error("SYNC_CONFLICT"); const nextVersionValue = await this.nextVersion(); const fields: Record<string, unknown> = { name: patch.name ?? current.name, latitude: patch.latitude ?? current.latitude, longitude: patch.longitude ?? current.longitude, timezone: patch.timezone ?? current.timezone, country_code: patch.countryCode !== undefined ? patch.countryCode : current.countryCode, admin1: patch.admin1 !== undefined ? patch.admin1 : current.admin1, admin2: patch.admin2 !== undefined ? patch.admin2 : current.admin2, alias: patch.alias !== undefined ? patch.alias : current.alias, sort_order: patch.sortOrder ?? current.sortOrder, analysis_enabled: patch.analysisEnabled ?? current.analysisEnabled, fallback_provider: patch.fallbackProvider ?? current.fallbackProvider, raw_retention_days: patch.rawRetentionDays ?? current.rawRetentionDays, sync_version: nextVersionValue }; const values = Object.values(fields); const assignments = Object.keys(fields).map((key, index) => `${key} = $${index + 1}`).join(", "); const result = await this.pool.query<PgRow>(`UPDATE hub_locations SET ${assignments}, updated_at = now() WHERE id = $${values.length + 1} AND deleted_at IS NULL RETURNING *`, [...values, id]); if (!result.rows[0]) throw new Error("LOCATION_NOT_FOUND"); const location = locationFromRow(result.rows[0]); await this.pool.query("INSERT INTO sync_changes (version, entity, entity_id, operation, payload) VALUES ($1,'hub_location',$2,'upsert',$3)", [nextVersionValue, id, location]); return location; }
  async deleteLocation(id: string): Promise<HubLocation> { const current = await this.getLocation(id); if (!current || current.deletedAt !== null) throw new Error("LOCATION_NOT_FOUND"); const version = await this.nextVersion(); const result = await this.pool.query<PgRow>("UPDATE hub_locations SET deleted_at = now(), updated_at = now(), sync_version = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *", [version, id]); const location = locationFromRow(result.rows[0] as PgRow); await this.pool.query("INSERT INTO sync_changes (version, entity, entity_id, operation, payload) VALUES ($1,'hub_location',$2,'delete',NULL)", [version, id]); return location; }
  async getChanges(since: number, limit: number): Promise<{ cursor: number; changes: SyncChange[]; hasMore: boolean }> { const result = await this.pool.query<PgRow>("SELECT * FROM sync_changes WHERE version > $1 ORDER BY version LIMIT $2", [since, limit]); const changes = result.rows.map(changeFromRow); const cursor = changes.at(-1)?.version ?? since; const more = await this.pool.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM sync_changes WHERE version > $1) AS exists", [cursor]); return { cursor, changes, hasMore: Boolean(more.rows[0]?.exists) }; }
  async getSettings(): Promise<Settings> { const result = await this.pool.query<PgRow>("SELECT * FROM settings WHERE id = 1"); const row = result.rows[0]; if (!row) { await this.pool.query("INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING"); return { calibrationEnabled: true, ingestionEnabled: false, rawRetentionDays: 365, serverName: "MeteoHub" }; } return settingsFromRow(row); }
  async updateSettings(patch: SettingsPatch): Promise<Settings> { const current = await this.getSettings(); const next: Settings = { calibrationEnabled: patch.calibrationEnabled ?? current.calibrationEnabled, ingestionEnabled: patch.ingestionEnabled ?? current.ingestionEnabled, rawRetentionDays: patch.rawRetentionDays ?? current.rawRetentionDays, serverName: patch.serverName ?? current.serverName }; await this.pool.query("INSERT INTO settings (id, server_name, calibration_enabled, ingestion_enabled, raw_retention_days) VALUES (1,$1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET server_name = $1, calibration_enabled = $2, ingestion_enabled = $3, raw_retention_days = $4, updated_at = now()", [next.serverName,next.calibrationEnabled,next.ingestionEnabled,next.rawRetentionDays]); return next; }
  async saveForecast(locationId: string, forecast: FusedForecast, values: ForecastValue[]): Promise<void> { const client = await this.pool.connect(); try { await client.query("BEGIN"); await client.query("INSERT INTO fused_forecasts (location_id,generated_at,timezone,payload) VALUES ($1,$2,$3,$4) ON CONFLICT (location_id) DO UPDATE SET generated_at=$2,timezone=$3,payload=$4", [locationId,forecast.generatedAt,forecast.timezone,forecast]); const runIds = new Map<string, string>(); for (const value of values) { const runKey = `${locationId}:${value.modelId}:${value.runAt}`; if (!runIds.has(runKey)) { const fetchedAt = String(value.metadata?.fetchedAt ?? forecast.generatedAt); const result = await client.query<{ id: string }>("INSERT INTO forecast_runs (location_id,model_id,run_at,fetched_at,source_version,request_key,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (request_key) DO UPDATE SET fetched_at = EXCLUDED.fetched_at RETURNING id", [locationId,value.modelId,value.runAt,fetchedAt,value.sourceVersion,runKey,value.metadata ?? {}]); const runId = result.rows[0]?.id; if (!runId) throw new Error("FORECAST_RUN_ID_MISSING"); runIds.set(runKey, runId); } const runId = runIds.get(runKey); if (!runId) throw new Error("FORECAST_RUN_ID_MISSING"); await client.query("INSERT INTO forecast_values (run_id,location_id,model_id,run_at,valid_at,lead_hours,variable,value,source_version,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (location_id,model_id,run_at,valid_at,variable) DO UPDATE SET value = EXCLUDED.value, source_version = EXCLUDED.source_version, metadata = EXCLUDED.metadata", [runId,locationId,value.modelId,value.runAt,value.validAt,value.leadHours,value.variable,value.value,value.sourceVersion,value.metadata ?? {}]); } await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
  async getForecast(locationId: string): Promise<FusedForecast | null> { const result = await this.pool.query<PgRow>("SELECT payload FROM fused_forecasts WHERE location_id = $1", [locationId]); return result.rows[0]?.payload as FusedForecast | null ?? null; }
  async getEvolution(locationId: string, variable: string, validAt?: string): Promise<ForecastValue[]> { const params: unknown[] = [locationId, variable]; let condition = "location_id = $1 AND variable = $2"; if (validAt !== undefined) { params.push(validAt); condition += " AND valid_at = $3"; } const result = await this.pool.query<PgRow>(`SELECT model_id,run_at,valid_at,lead_hours,variable,value,source_version,metadata FROM forecast_values WHERE ${condition} ORDER BY valid_at,run_at`, params); return result.rows.map((row) => ({ modelId: String(row.model_id), runAt: new Date(String(row.run_at)).toISOString(), validAt: new Date(String(row.valid_at)).toISOString(), leadHours: Number(row.lead_hours), variable: String(row.variable), value: row.value === null ? null : Number(row.value), sourceVersion: String(row.source_version), metadata: row.metadata as Record<string, unknown> })); }
  async getPerformance(locationId: string): Promise<Record<string, unknown>> { const result = await this.pool.query<PgRow>("SELECT model_id,variable,COUNT(*)::int AS samples,AVG(mae)::float AS mae,AVG(bias)::float AS bias,AVG(brier_score)::float AS brier_score FROM verification_scores WHERE location_id = $1 GROUP BY model_id,variable ORDER BY model_id,variable", [locationId]); return { locationId, sampleCount: result.rows.reduce((sum, row) => sum + Number(row.samples), 0), models: result.rows }; }
  async close(): Promise<void> { await this.pool.end(); }
  private async nextVersion(): Promise<number> { const result = await this.pool.query<{ version: number }>("SELECT COALESCE(MAX(version),0)+1 AS version FROM sync_changes"); return Number(result.rows[0]?.version ?? 1); }
}

async function nextVersion(client: { query: (query: string) => Promise<{ rows: PgRow[] }> }): Promise<number> { const result = await client.query("SELECT COALESCE(MAX(version),0)+1 AS version FROM sync_changes"); return Number(result.rows[0]?.version ?? 1); }
async function insertChange(client: { query: (query: string, values: unknown[]) => Promise<unknown> }, version: number, operation: string, location: HubLocation): Promise<void> { await client.query("INSERT INTO sync_changes (version,entity,entity_id,operation,payload) VALUES ($1,'hub_location',$2,$3,$4)", [version, location.id, operation, operation === "upsert" ? location : null]); }

function stringValue(value: unknown): string { return value instanceof Date ? value.toISOString() : String(value); }
function nullableString(value: unknown): string | null { return value == null ? null : stringValue(value); }
function locationFromRow(row: PgRow): HubLocation { return { id: stringValue(row.id), name: stringValue(row.name), latitude: Number(row.latitude), longitude: Number(row.longitude), timezone: stringValue(row.timezone), countryCode: nullableString(row.country_code), admin1: nullableString(row.admin1), admin2: nullableString(row.admin2), alias: nullableString(row.alias), sortOrder: Number(row.sort_order), analysisEnabled: Boolean(row.analysis_enabled), createdAt: stringValue(row.created_at), updatedAt: stringValue(row.updated_at), deletedAt: nullableString(row.deleted_at), syncVersion: Number(row.sync_version), fallbackProvider: stringValue(row.fallback_provider), rawRetentionDays: Number(row.raw_retention_days) }; }
function changeFromRow(row: PgRow): SyncChange { const operation = String(row.operation); return { version: Number(row.version), entity: "hub_location", entityId: stringValue(row.entity_id), operation: operation === "delete" ? "delete" : "upsert", payload: row.payload as HubLocation | undefined, occurredAt: stringValue(row.occurred_at) }; }
function settingsFromRow(row: PgRow): Settings { return { serverName: stringValue(row.server_name), calibrationEnabled: Boolean(row.calibration_enabled), ingestionEnabled: Boolean(row.ingestion_enabled), rawRetentionDays: Number(row.raw_retention_days) }; }
