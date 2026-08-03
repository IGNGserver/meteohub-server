import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const retentionDays = Number(process.env.RAW_RETENTION_DAYS ?? 365);
if (!Number.isInteger(retentionDays) || retentionDays < 30) throw new Error("RAW_RETENTION_DAYS must be an integer >= 30");
const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const values = await client.query("DELETE FROM forecast_values WHERE run_at < now() - make_interval(days => $1) AND valid_at < now() - make_interval(days => $1)", [retentionDays]);
  const runs = await client.query("DELETE FROM forecast_runs r WHERE NOT EXISTS (SELECT 1 FROM forecast_values v WHERE v.run_id = r.id)");
  const observations = await client.query("DELETE FROM observations WHERE observed_at < now() - make_interval(days => $1)", [retentionDays]);
  await client.query("DELETE FROM ingestion_jobs WHERE created_at < now() - interval '90 days'");
  await client.query("COMMIT");
  console.log(JSON.stringify({ deletedForecastValues: values.rowCount ?? 0, deletedRuns: runs.rowCount ?? 0, deletedObservations: observations.rowCount ?? 0 }));
} catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
