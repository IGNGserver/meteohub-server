# MeteoHub Server

MeteoHub Server is a single-user, self-hosted weather analysis hub for multiple paired devices. It archives the forecast that was actually published by each model, blends available models, and exposes a stable API for a future Breezy Weather fork.

It is CPU-only. It does not run a global weather model locally and does not put an LLM in the prediction path. Recommended sizing is 4 CPU cores and 8 GB RAM; 2 cores and 4 GB RAM is a practical minimum for a small number of hub locations. It does not promise to beat every official source. “Confidence” means model agreement plus available historical skill, not an absolute guarantee.

## Quick start

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD and TOKEN_PEPPER in .env
docker compose up -d --build
```

Open `http://localhost:8080/docs`. The first `POST /api/v1/pairing-codes` creates a one-time code. Pair a device with `POST /api/v1/pair`; store the returned token in the client’s secure storage. See [DEPLOYMENT.md](DEPLOYMENT.md) for LAN/TLS boundaries.

For local domain/API work without PostgreSQL, omit `DATABASE_URL` and run `pnpm dev`; the server uses an in-memory store explicitly intended for development and tests.

## Project status

Phase 1 includes a Fastify API, PostgreSQL 16 schema/migrations, Open-Meteo Provider adapter, idempotent ingestion coordinator, static cold-start weights, circular wind fusion, severity-weighted WMO code fusion, spread/confidence, sample-gated rolling calibration, pairing/device auth, sync cursors and tombstones, OpenAPI, backup scripts, CI, and tests.

The production scheduler is conservative: it runs only when `INGESTION_ENABLED=true`, skips disabled locations, retries temporary provider failures, and leaves a partial model set usable when one model is unavailable.

## Development

```bash
corepack enable
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

If pnpm asks for build-script approval on a new development machine, approve the normal dependency build scripts with `pnpm approve-builds --all`. The repository lockfile is committed.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [API.md](API.md) and the generated [OpenAPI endpoint](http://localhost:8080/api/v1/openapi.json)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [SECURITY.md](SECURITY.md)
- [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md)
- [Compatibility matrix](COMPATIBILITY.md)
- [Release and operations runbook](docs/release-runbook.md)
- [ubuntu-vm deployment record](docs/ubuntu-vm-deployment.md)
- [Android integration](docs/android-integration.md)
- [Data model and time semantics](docs/data-model-and-time.md)
- [Algorithms](docs/algorithms.md)
- [Known limitations](docs/known-limitations.md)
- [ADRs](docs/adr)

## License

Original MeteoHub Server code is MIT licensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the upstream research record and license handling.
