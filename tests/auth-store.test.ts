import { describe, expect, it } from "vitest";
import { buildAuthService } from "../src/auth/auth.js";
import { MemoryStore, hashSecret } from "../src/storage/store.js";

describe("pairing and devices", () => {
  it("is one-time and creates a token whose hash is the only stored credential", async () => {
    const store = new MemoryStore(); const auth = buildAuthService(store, "test-pepper-which-is-long", 10);
    const pairing = await auth.issuePairingCode();
    const result = await auth.pair(pairing.code, "Pixel");
    expect(result.token).toMatch(/^mh_/);
    expect(await auth.authenticate(result.token)).toMatchObject({ name: "Pixel" });
    await expect(auth.pair(pairing.code, "Second")) .rejects.toThrow("PAIRING_CODE_INVALID");
    expect(await store.getDeviceByTokenHash(hashSecret(result.token, "test-pepper-which-is-long"))).toMatchObject({ name: "Pixel" });
  });

  it("rejects expired pairing codes and revoked devices", async () => {
    const store = new MemoryStore(); const auth = buildAuthService(store, "test-pepper-which-is-long", 10);
    await store.createPairingCode(hashSecret("EXPIRED", "test-pepper-which-is-long"), "IRED", "2000-01-01T00:00:00.000Z");
    await expect(auth.pair("EXPIRED", "Old phone")).rejects.toThrow("PAIRING_CODE_INVALID");
    const pairing = await auth.issuePairingCode(); const result = await auth.pair(pairing.code, "Tablet");
    const device = await auth.authenticate(result.token); expect(device).not.toBeNull();
    await store.revokeDevice(device!.id);
    expect(await auth.authenticate(result.token)).toBeNull();
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
