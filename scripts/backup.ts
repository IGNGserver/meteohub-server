import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL is required");
const output = process.env.BACKUP_FILE ?? `backups/meteohub-${new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")}.dump`;
await mkdir(resolve(process.cwd(), "backups"), { recursive: true });
await new Promise<void>((resolve, reject) => { const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--file", output, url], { stdio: "inherit" }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_dump exited with ${code}`))); });
console.log(`Backup written to ${output}`);
