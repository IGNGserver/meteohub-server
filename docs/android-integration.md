# Android integration contract

The future MeteoHub Android client should remain a Breezy Weather fork. Ordinary local locations continue using Breezy’s original source and refresh path. Only a location paired to a MeteoHub hub-location ID uses this server’s fused result.

## Pairing

1. User enters the HTTPS server URL and the six/ten-character one-time code.
2. `POST /api/v1/pair` with `{ "code": "...", "deviceName": "Pixel" }` returns a bearer token and device metadata.
3. Store the token in Android Keystore-backed secure storage. Do not log it.

## Data mapping

`GET /locations` maps to the client’s hub location list. `GET /locations/{id}/forecast` maps `current`, `hourly`, and `daily` to Breezy’s current/hourly/daily presentation concepts. All numerical units are explicit in field names: Celsius, millimeters, km/h, degrees, percent, and hPa. A future adapter may convert to Breezy unit classes locally.

Use `GET /locations/{id}/analysis` only for analysis screens or detail drawers. Do not download evolution/performance when opening the normal weather home screen.

## Sync

Persist the last server cursor. Call `/locations/sync?since=<cursor>` after reconnect and apply upserts/deletes in order. Keep tombstones until the cursor advances beyond them. Do not send local ordinary locations to the server. Client-only hide/favorite state must remain separate from server deletion.

## Errors and TLS

Handle `401` by marking the device disconnected and requiring re-pairing; handle `503 FORECAST_NOT_READY` with cached data and a non-alarming “analysis is collecting data” state. Never disable TLS verification. Plain HTTP is only for a trusted development LAN and must never be silently enabled for an internet URL.
