# Changelog

## 1.1.0 — Shared-key authentication

- Replace pairing codes, device records, and per-client tokens with one shared hub access key.
- Allow every authorized client to read, create, update, reorder, and delete hub locations.
- Keep legacy authentication tables only for non-destructive database upgrades; runtime code no longer reads or writes them.
- Update the Android integration contract, deployment guidance, security notes, and release evidence for the new connection model.

## 1.0.0 — First stable release

- First stable MeteoHub Server release with API v1 compatibility.
- Production Compose pulls the immutable GHCR patch tag by default.
- Candidate and release workflows publish SBOM/provenance metadata and stable image aliases.
- Production startup rejects missing database configuration, placeholder token peppers, and debug logging.

Known limitations: the server is CPU-only; the bundled Open-Meteo adapter is a provider boundary and does not guarantee forecast accuracy; HTTPS termination remains the responsibility of an existing trusted reverse proxy or VPN.

## 0.1.0 — Phase 1

- Initial self-hosted Fastify/TypeScript server.
- PostgreSQL 16 schema, rerunnable migration, backup and restore scripts.
- Device pairing, hashed tokens, location CRUD, authoritative sync cursor and tombstones.
- Open-Meteo Provider boundary with retry/timeout and model-aware raw archive.
- Cold-start multi-model fusion, circular wind mean, weather-code severity mode, spread and confidence.
- Sample-gated rolling bias correction with bounded, disable-able fallback.
- OpenAPI, Docker Compose, CI, Android integration contract, and deterministic tests.
