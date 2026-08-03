import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";

const url = process.env.DATABASE_URL; const input = process.env.BACKUP_FILE;
if (!url || !input) throw new Error("DATABASE_URL and BACKUP_FILE are required");
const info = await stat(input); if (!info.isFile() || info.size === 0) throw new Error("BACKUP_FILE must point to a non-empty file");
await new Promise<void>((resolve, reject) => { const child = spawn("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", url, input], { stdio: "inherit" }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_restore exited with ${code}`))); });
console.log(`Restore completed from ${input}`);
