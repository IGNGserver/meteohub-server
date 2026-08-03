# Deployment

## Compose

Create `.env` from `.env.example`, set a unique `POSTGRES_PASSWORD` and a long random `TOKEN_PEPPER`, then run:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f server
```

The server image is `ghcr.io/${GHCR_OWNER:-IGNGserver}/meteohub-server:${IMAGE_TAG:-latest}`. The release Compose file only pulls this image; it does not build a production container from source. `latest` is suitable for a personal installation, while production should pin `IMAGE_TAG` to an exact patch tag such as `1.0.0`.

PostgreSQL data is in the named `postgres-data` volume. Backups and logs are bind-mounted from `./backups` and `./logs`. The example resource limit is 2 CPU / 2 GB per service; use 4 CPU / 8 GB host capacity for comfortable multi-location history.

## Migrations

The image contains the migration SQL and scripts. Run migrations from a one-off container or an admin shell with `DATABASE_URL` set:

```bash
docker compose exec -e DATABASE_URL=postgres://meteohub:$POSTGRES_PASSWORD@postgres:5432/meteohub server node dist/scripts/migrate.js
```

The API process does not silently mutate the schema on boot. This keeps upgrades reviewable and restart-safe.

## LAN and TLS

Pairing and device tokens are credentials. Prefer a reverse proxy with a trusted LAN certificate or a private VPN. Do not disable TLS verification in a client to “fix” certificate errors. Plain HTTP is acceptable only on a trusted, isolated LAN during initial development, with no port forwarding and a clear understanding that pairing codes/tokens can be observed by anyone on that network. Do not expose port 8080 directly to the public internet.

The server does not terminate TLS itself in Phase 1; reverse-proxy TLS and certificate rotation are deployment concerns. The API deliberately sets no CORS origin for browser use by default.

## Architecture support

The Dockerfile targets `linux/amd64` and is written to remain `linux/arm64` compatible. It has no GPU or native ML dependency. If using ARM Compose build locally, use BuildKit/buildx.
