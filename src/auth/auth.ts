import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

const MIN_HUB_KEY_LENGTH = 6;

export interface AuthService {
  authenticate(key: string): boolean;
}

/**
 * MeteoHub is intentionally single-user: every client presents the same
 * server-configured access key. The key is kept outside the database and is
 * compared in constant time so there is no device or user record to manage.
 */
export function buildAuthService(accessKey: string): AuthService {
  const expected = Buffer.from(accessKey, "utf8");
  return {
    authenticate(key) {
      const candidate = Buffer.from(key, "utf8");
      return candidate.length === expected.length && timingSafeEqual(candidate, expected);
    },
  };
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply, auth: AuthService): Promise<boolean> {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "UNAUTHENTICATED", message: "Bearer hub access key required" });
    return false;
  }
  const key = header.slice("Bearer ".length).trim();
  if (key.length < MIN_HUB_KEY_LENGTH || !auth.authenticate(key)) {
    await reply.code(401).send({ error: "UNAUTHENTICATED", message: "Invalid hub access key" });
    return false;
  }
  return true;
}
