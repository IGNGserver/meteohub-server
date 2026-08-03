import type { FastifyReply, FastifyRequest } from "fastify";
import { createPairingCode, createDeviceToken, hashSecret, type Store } from "../storage/store.js";
import type { Device } from "../domain/types.js";

export interface AuthService {
  issuePairingCode(): Promise<{ code: string; expiresAt: string }>;
  pair(code: string, deviceName: string): Promise<{ token: string; device: Device }>;
  authenticate(token: string): Promise<Device | null>;
}

export function buildAuthService(store: Store, pepper: string, ttlMinutes: number): AuthService {
  return {
    async issuePairingCode() {
      const code = createPairingCode();
      const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
      await store.createPairingCode(hashSecret(code, pepper), code.slice(-4), expiresAt);
      return { code, expiresAt };
    },
    async pair(code, deviceName) {
      const consumed = await store.consumePairingCode(hashSecret(code, pepper), new Date().toISOString());
      if (consumed === null) throw new Error("PAIRING_CODE_INVALID");
      const token = createDeviceToken();
      const device = await store.createDevice(deviceName, hashSecret(token, pepper));
      return { token, device };
    },
    async authenticate(token) { return store.getDeviceByTokenHash(hashSecret(token, pepper)); },
  };
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply, auth: AuthService, store: Store): Promise<Device | null> {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) { await reply.code(401).send({ error: "UNAUTHENTICATED", message: "Bearer device token required" }); return null; }
  const token = header.slice("Bearer ".length).trim();
  if (token.length < 20) { await reply.code(401).send({ error: "UNAUTHENTICATED", message: "Invalid device token" }); return null; }
  const device = await auth.authenticate(token);
  if (device === null || device.revokedAt !== null) { await reply.code(401).send({ error: "UNAUTHENTICATED", message: "Unknown or revoked device token" }); return null; }
  await store.updateDeviceSeen(device.id);
  return device;
}
