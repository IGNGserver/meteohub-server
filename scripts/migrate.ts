import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: url, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false });
const client = await pool.connect();
try {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  await client.query("SELECT pg_advisory_lock(187534101)");
  const drizzleDir = join(process.cwd(), "drizzle");
  const files = (await readdir(drizzleDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const existing = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
    if (existing.rowCount) continue;
    const sql = await readFile(join(drizzleDir, file), "utf8");
    await client.query("BEGIN");
    try { await client.query(sql); await client.query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING", [version]); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; }
  }
  console.log("MeteoHub migrations are up to date");
} finally { await client.query("SELECT pg_advisory_unlock(187534101)").catch(() => undefined); client.release(); await pool.end(); }
