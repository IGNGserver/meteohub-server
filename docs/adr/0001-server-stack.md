# ADR 0001: Fastify, TypeScript, PostgreSQL, Drizzle schema

Status: accepted

Node.js 24, strict TypeScript, Fastify 5, Zod, PostgreSQL 16, and Drizzle schema/migrations were selected. They are CPU-friendly, have a small operational surface, and keep the domain layer reusable by a future Android-facing API. No Redis is introduced because Phase 1 has one process and PostgreSQL is already the durable coordination point. The store interface permits later replacement or a PostgreSQL advisory-lock scheduler without changing API/domain code.
