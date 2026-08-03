import { z } from "zod";

const booleanEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().optional(),
  DATABASE_SSL: booleanEnv.default(false),
  APP_VERSION: z.string().default("1.0.0"),
  TOKEN_PEPPER: z.string().min(16).default("development-only-change-me-please"),
  PAIRING_CODE_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  RAW_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(365),
  CALIBRATION_ENABLED: booleanEnv.default(true),
  INGESTION_ENABLED: booleanEnv.default(false),
  OPEN_METEO_BASE_URL: z.string().url().default("https://api.open-meteo.com"),
  OPEN_METEO_ARCHIVE_BASE_URL: z.string().url().default("https://archive-api.open-meteo.com"),
  OPEN_METEO_SINGLE_RUNS_BASE_URL: z.string().url().default("https://single-runs-api.open-meteo.com"),
  OPEN_METEO_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(12000),
  LOG_LEVEL: z.string().default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = envSchema.parse(env);
  if (config.NODE_ENV === "production") {
    if (!config.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
    if (config.TOKEN_PEPPER === "development-only-change-me-please" || config.TOKEN_PEPPER === "replace-with-a-long-random-secret") {
      throw new Error("TOKEN_PEPPER must be replaced in production");
    }
    if (["debug", "trace"].includes(config.LOG_LEVEL.toLowerCase())) throw new Error("Debug logging is not allowed in production");
  }
  return config;
}
