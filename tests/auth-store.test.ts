import { describe, expect, it } from "vitest";
import { buildAuthService } from "../src/auth/auth.js";
import { MemoryStore } from "../src/storage/store.js";

describe("shared hub key authentication", () => {
  it("accepts the configured key for every client without creating identities", () => {
    const auth = buildAuthService("shared-hub-key");
    expect(auth.authenticate("shared-hub-key")).toBe(true);
    expect(auth.authenticate("wrong-hub-key")).toBe(false);
    expect(auth.authenticate("shared-hub-key-extra")).toBe(false);
  });
});

describe("location sync", () => {
  it("emits ordered changes and a delete tombstone", async () => {
    const store = new MemoryStore();
    const location = await store.createLocation({ name: "Shanghai", latitude: 31.23, longitude: 121.47, timezone: "Asia/Shanghai" });
    const updated = await store.updateLocation(location.id, { alias: "Home" }, location.syncVersion);
    await store.deleteLocation(location.id);
    const sync = await store.getChanges(0, 10);
    expect(sync.changes.map((change) => change.operation)).toEqual(["upsert", "upsert", "delete"]);
    expect(sync.changes.at(-1)?.payload).toBeUndefined();
    await expect(store.updateLocation(location.id, { name: "stale" }, updated.syncVersion)).rejects.toThrow("LOCATION_NOT_FOUND");
  });
});
