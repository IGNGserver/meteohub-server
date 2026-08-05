import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { AppConfig } from "../config/config.js";
import { buildAuthService } from "../auth/auth.js";
import { registerRoutes } from "./routes.js";
import type { Store } from "../storage/store.js";

export async function buildServer(config: AppConfig, store: Store): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: false });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: false });
  await app.register(swagger, { openapi: { info: { title: "MeteoHub Server API", version: config.APP_VERSION } } });
  await app.register(swaggerUi, { routePrefix: "/docs", uiConfig: { url: "/api/v1/openapi.json" } });
  await registerRoutes(app, { store, config, auth: buildAuthService(config.HUB_ACCESS_KEY) });
  app.setErrorHandler((error, request, reply) => { if (error instanceof Error && error.name === "ZodError") return reply.code(400).send({ error: "INVALID_INPUT", details: error }); request.log.error(error); return reply.code(500).send({ error: "INTERNAL_ERROR" }); });
  return app;
}
