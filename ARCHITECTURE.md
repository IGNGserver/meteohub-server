# Architecture

```text
Android / other clients
             │ Bearer shared hub access key
             ▼
      Fastify API + OpenAPI
       │          │
       │          └── in-memory store (development/tests)
       ▼
PostgresStore (Drizzle schema, parameterized SQL adapter)
       │
       ├── locations, settings, sync changes/tombstones
       ├── forecast runs/values, observations, verification, calibration
       └── fused forecast snapshots and ingestion job records

Scheduler → IngestionCoordinator → WeatherProvider → Open-Meteo
                         │
                         └→ raw archive → calibration/verification → fusion
```

## Boundaries

`src/domain` is pure, deterministic TypeScript for model registry, weights, circular statistics, WMO code fusion, calibration, and confidence. `src/providers` converts provider-specific JSON into normalized points. `src/ingestion` owns retries, partial failure policy, run/valid-time semantics, and idempotent persistence. `src/storage` owns durable data and its in-memory test double. `src/api` owns validation and the stable client contract. `src/scheduler` is a single-process, non-overlapping runner.

No Redis is used: the single-user deployment has one server process, PostgreSQL provides the durable lock/change ledger, and the scheduler’s in-process guard prevents duplicate concurrent runs. If horizontal server replicas become a requirement, add a PostgreSQL advisory-lock based scheduler before scaling out.

The PostgreSQL schema is declared in `src/storage/schema.ts`; `drizzle/0000_initial.sql` is intentionally rerunnable. The current store adapter uses parameterized SQL for the operational query set while keeping Drizzle as the schema/type source and migration tool boundary.

The initial migration contains legacy `devices` and `pairing_codes` tables from the retired authentication design. They are intentionally left in place for non-destructive upgrades, but the current schema, store, API, and clients never read or write them.

## Data flow

1. A scheduled run selects enabled models from the registry.
2. Each Provider request is isolated and retried only for timeout, rate-limit, and 5xx errors.
3. Normalized values retain model ID, model run time, fetch time, valid time, lead, and source version.
4. Available values are fused per valid hour. Missing model values are omitted and weights renormalized.
5. The fused snapshot is lightweight enough for a weather home screen; analysis endpoints return disagreement and history on demand.

The service never rewrites an old run as if it had been issued at a later fetch time. When Open-Meteo does not expose an explicit run timestamp, the adapter uses the model’s update cadence floor as a documented conservative approximation and stores the fetched time separately.
