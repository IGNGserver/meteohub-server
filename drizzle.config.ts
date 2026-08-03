import type { Config } from "drizzle-kit";

export default {
  schema: "./src/storage/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://meteohub:change-me@localhost:5432/meteohub" },
  strict: true,
  verbose: true,
} satisfies Config;
