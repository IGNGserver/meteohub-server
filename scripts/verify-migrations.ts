import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const drizzleDir = join(process.cwd(), "drizzle");
const files = (await readdir(drizzleDir)).filter((file) => file.endsWith(".sql")).sort();
if (files.length === 0) throw new Error("No migrations found");
const hashes: string[] = [];
for (const file of files) { const content = await readFile(join(drizzleDir, file), "utf8"); if (!content.includes("CREATE TABLE IF NOT EXISTS \"schema_migrations\"")) throw new Error(`${file} does not create the migration ledger`); hashes.push(`${file}:${createHash("sha256").update(content).digest("hex")}`); }
console.log(hashes.join("\n"));
