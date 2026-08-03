import { loadConfig } from "./config/config.js";
import { buildServer } from "./api/server.js";
import { MemoryStore, PostgresStore, type Store } from "./storage/store.js";
import { OpenMeteoProvider } from "./providers/open-meteo.js";
import { IngestionCoordinator } from "./ingestion/ingestion.js";
import { Scheduler } from "./scheduler/scheduler.js";

const config = loadConfig();
const store: Store = config.DATABASE_URL ? new PostgresStore(config.DATABASE_URL, config.DATABASE_SSL) : new MemoryStore();
const provider = new OpenMeteoProvider(config);
const ingestion = new IngestionCoordinator(store, provider);
const scheduler = new Scheduler(store, ingestion);
const app = await buildServer(config, store);
if (config.INGESTION_ENABLED) { await store.updateSettings({ ingestionEnabled: true }); scheduler.start(); }
await app.listen({ host: config.HOST, port: config.PORT });

const shutdown = async (signal: string) => { app.log.info({ signal }, "shutting down"); scheduler.stop(); await app.close(); await store.close(); process.exit(0); };
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
