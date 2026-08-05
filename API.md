# API contract

Base path: `/api/v1`. JSON timestamps are ISO 8601 with a `Z` suffix. Model run time is the time the model run was issued; `fetchedAt` is when MeteoHub received it; `validAt` is the time the value describes. A daily `date` is a calendar date in the location timezone, not UTC midnight.

Public endpoints:

- `GET /health`
- `GET /version`
- `GET /openapi.json`
Authenticated endpoints use the same shared key on every client: `Authorization: Bearer <hub-access-key>`.

There is no user, device, pairing, or per-client token mechanism. The hub access key is configured on the server and entered by each client.

Authenticated endpoints:

- `GET /locations`, `POST /locations`, `PATCH /locations/{id}`, `DELETE /locations/{id}`
- `POST /locations/reorder` with `{ "ids": ["uuid", ...] }`
- `GET /locations/sync?since=<cursor>&limit=<n>`
- `GET /locations/candidates?latitude=&longitude=&timezone=&countryCode=`
- `GET /locations/{id}/forecast`
- `GET /locations/{id}/analysis`
- `GET /locations/{id}/evolution?variable=&validAt=`
- `GET /locations/{id}/performance`
- `GET /sources`, `GET /settings`, `PATCH /settings`

## Sync semantics

The server is authoritative for hub locations. Every upsert/delete emits a monotone `syncVersion` and a change cursor. Deletes are tombstones; a client must retain them until it has acknowledged a cursor beyond the tombstone. “Hidden locally” is a client-only presentation state and must not call `DELETE`. Updates are last-write-protected when `expectedVersion` is supplied; mismatches return `SYNC_CONFLICT`. Repeating the same update after the client refreshes is safe.

Forecast is intentionally a normal-client shape: `current`, `hourly`, and `daily`. Analysis is separate and may include spread, confidence, contributing models, and disagreement samples. A missing forecast returns `503 FORECAST_NOT_READY`, not a fabricated dry/clear value.

The full generated OpenAPI 3.0.3 document is served at `/api/v1/openapi.json`; Swagger UI is at `/docs`.
