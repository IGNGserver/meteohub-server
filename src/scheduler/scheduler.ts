import type { Store } from "../storage/store.js";
import type { IngestionCoordinator } from "../ingestion/ingestion.js";

export class Scheduler {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  constructor(private readonly store: Store, private readonly ingestion: IngestionCoordinator, private readonly intervalMs = 30 * 60_000) {}
  start(): void { if (this.timer) return; this.timer = setInterval(() => { void this.runOnce(); }, this.intervalMs); void this.runOnce(); }
  async runOnce(): Promise<void> { if (this.running) return; this.running = true; try { const settings = await this.store.getSettings(); if (!settings.ingestionEnabled) return; for (const location of await this.store.getLocations()) if (location.analysisEnabled) await this.ingestion.runLocation(location); } finally { this.running = false; } }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
}
