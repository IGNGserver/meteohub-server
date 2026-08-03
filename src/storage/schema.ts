import { boolean, integer, jsonb, numeric, pgTable, real, serial, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const timestamps = { createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() };

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  serverName: text("server_name").notNull().default("MeteoHub"),
  calibrationEnabled: boolean("calibration_enabled").notNull().default(true),
  ingestionEnabled: boolean("ingestion_enabled").notNull().default(false),
  rawRetentionDays: integer("raw_retention_days").notNull().default(365),
  ...timestamps,
});

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  syncCursor: integer("sync_cursor").notNull().default(0),
  ...timestamps,
}, (table) => ({ tokenHashIdx: uniqueIndex("devices_token_hash_idx").on(table.tokenHash) }));

export const pairingCodes = pgTable("pairing_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  codeHash: text("code_hash").notNull(),
  codeHint: varchar("code_hint", { length: 4 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  ...timestamps,
});

export const hubLocations = pgTable("hub_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timezone: text("timezone").notNull(),
  countryCode: varchar("country_code", { length: 2 }),
  admin1: text("admin1"),
  admin2: text("admin2"),
  alias: text("alias"),
  sortOrder: integer("sort_order").notNull().default(0),
  analysisEnabled: boolean("analysis_enabled").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  syncVersion: integer("sync_version").notNull().default(0),
  fallbackProvider: text("fallback_provider").notNull().default("open-meteo"),
  rawRetentionDays: integer("raw_retention_days").notNull().default(365),
  ...timestamps,
});

export const syncChanges = pgTable("sync_changes", {
  version: serial("version").primaryKey(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id").notNull(),
  operation: text("operation").notNull(),
  payload: jsonb("payload"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forecastRuns = pgTable("forecast_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull(),
  modelId: text("model_id").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  sourceVersion: text("source_version").notNull(),
  requestKey: text("request_key").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => ({ requestKeyIdx: uniqueIndex("forecast_runs_request_key_idx").on(table.requestKey) }));

export const forecastValues = pgTable("forecast_values", {
  id: serial("id").primaryKey(),
  runId: uuid("run_id").notNull(),
  locationId: uuid("location_id").notNull(),
  modelId: text("model_id").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull(),
  validAt: timestamp("valid_at", { withTimezone: true }).notNull(),
  leadHours: integer("lead_hours").notNull(),
  variable: text("variable").notNull(),
  value: numeric("value"),
  sourceVersion: text("source_version").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => ({ valueIdx: uniqueIndex("forecast_values_identity_idx").on(table.locationId, table.modelId, table.runAt, table.validAt, table.variable) }));

export const observations = pgTable("observations", {
  id: serial("id").primaryKey(),
  locationId: uuid("location_id").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  variable: text("variable").notNull(),
  value: numeric("value"),
  provider: text("provider").notNull(),
  sourceVersion: text("source_version").notNull(),
}, (table) => ({ identityIdx: uniqueIndex("observations_identity_idx").on(table.locationId, table.observedAt, table.variable, table.provider) }));

export const verificationScores = pgTable("verification_scores", {
  id: serial("id").primaryKey(),
  locationId: uuid("location_id").notNull(),
  modelId: text("model_id").notNull(),
  variable: text("variable").notNull(),
  leadHours: integer("lead_hours").notNull(),
  scoreDate: timestamp("score_date", { withTimezone: true }).notNull(),
  mae: real("mae"),
  bias: real("bias"),
  brierScore: real("brier_score"),
  hits: integer("hits").notNull().default(0),
  misses: integer("misses").notNull().default(0),
  falseAlarms: integer("false_alarms").notNull().default(0),
});

export const calibrationParameters = pgTable("calibration_parameters", {
  id: serial("id").primaryKey(),
  locationId: uuid("location_id").notNull(),
  modelId: text("model_id").notNull(),
  variable: text("variable").notNull(),
  leadBand: integer("lead_band").notNull(),
  bias: real("bias").notNull(),
  sampleCount: integer("sample_count").notNull(),
  maxCorrection: real("max_correction").notNull(),
  modelVersion: text("model_version").notNull(),
  ...timestamps,
});

export const fusedForecasts = pgTable("fused_forecasts", {
  locationId: uuid("location_id").primaryKey(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull(),
  payload: jsonb("payload").notNull(),
  sourceRuns: jsonb("source_runs").notNull().default([]),
});

export const ingestionJobs = pgTable("ingestion_jobs", {
  id: serial("id").primaryKey(),
  jobKey: text("job_key").notNull(),
  locationId: uuid("location_id"),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  attempts: integer("attempts").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
  ...timestamps,
}, (table) => ({ jobKeyIdx: uniqueIndex("ingestion_jobs_job_key_idx").on(table.jobKey) }));

export const schemaMigrations = pgTable("schema_migrations", {
  version: text("version").primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});
