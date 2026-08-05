# MeteoHub release and operations runbook

## Install

Use the release `compose.yml` and `.env.example` from the server Release. Set a strong random `POSTGRES_PASSWORD` and a private `HUB_ACCESS_KEY`, keep `NODE_ENV=production`, and set `IMAGE_TAG` to the exact patch version for a production deployment:

```bash
cp .env.example .env
# edit .env; do not commit it
docker compose pull
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:8080/api/v1/health
```

The Compose file is pull-only for production. It does not build a server image from a checkout. `latest` is convenient for a personal installation; production and upgrade testing should use an exact patch tag.

The health endpoint is `/api/v1/health`; `/health` is not a supported route. Compose uses `restart: unless-stopped`: an operator-requested `docker kill` or `docker stop` is not a host/daemon failure simulation and may leave the service stopped until Compose starts it again. Verify daemon-restart recovery only with an authorized maintenance window.

## LAN, VPN, and HTTPS

The hub access key is a shared credential. If no trusted HTTPS endpoint or VPN exists, bind the host port only to a trusted private LAN and use the Android app's explicit trusted-LAN HTTP option. Do not port-forward it to the internet and do not disable TLS verification. With an existing Caddy, Nginx, Traefik, or VPN, add a route to the chosen host port instead of starting a second proxy. Obtain a trusted certificate before using the service outside the private network.

## Upgrade

1. Back up PostgreSQL before changing `IMAGE_TAG`.
2. Download the new release assets and verify `SHA256SUMS`.
3. Set `IMAGE_TAG` and `APP_VERSION` to the same exact version.
4. Run `docker compose pull` and `docker compose up -d`.
5. The container runs migrations before starting the API. Check `docker compose logs --tail=100 server`, `/api/v1/health`, and one authenticated request.

Application rollback and database rollback are different operations. An application image can be rolled back only when its schema is compatible; an irreversible migration requires restoring the pre-upgrade database backup into a controlled database before starting the older image.

## Rollback

For a compatible application rollback, set `IMAGE_TAG` back to the last known-good exact tag, pull, and restart. For an incompatible schema change, stop the stack, preserve the current backup, restore the pre-upgrade dump into a temporary database first, verify it, then restore it into the production database only after confirming the target. Never run `pg_restore --clean` against an unrelated database.

## Backup and recovery

Use `pg_dump --format=custom --no-owner`, retain multiple dated copies outside the VM, and test restoration periodically in a temporary PostgreSQL instance. After recovery run `db:verify`, start the server, check health, list locations, and perform one forecast request. The server's backup directory is not a substitute for an off-host backup.

## Secret rotation

Keep `.env` mode `600` and never print interpolated Compose configuration. Rotate `POSTGRES_PASSWORD` and `HUB_ACCESS_KEY`, synchronize the `meteohub` PostgreSQL role password if needed, then force-recreate the server container from the pinned image. Verify network database authentication, `/api/v1/health`, and one authenticated request. Rotating `HUB_ACCESS_KEY` invalidates all clients at once, so update the secure client configuration after the server restart.

## GHCR tag semantics

For a stable `1.0.0` release, the server publishes `1.0.0`, `1.0`, `1`, and `latest`. The exact patch tag is the deployment pin. Candidate, prerelease, beta, and RC tags use separate names and never move `latest`. Main-branch and candidate builds never update stable tags.

## Release lifecycle

The server candidate workflow is manually dispatched and publishes only `candidate-*`. Formal tags are created only after candidate Compose, API, migration, persistence, backup/restore, and Android checks pass. The server release workflow verifies the tag and test suite before publishing the image and release evidence. GitHub Releases remain draft until VM deployment and production smoke tests pass. A manual evidence rerun for an existing tag verifies stable tags without overwriting the exact patch tag.

## Troubleshooting

- `server` restarts: inspect `docker compose logs server`; missing `DATABASE_URL`, a placeholder `HUB_ACCESS_KEY`, and debug production logging are rejected at startup.
- Port conflict: change `METEOHUB_PORT` to an unused host port; do not stop an unrelated service.
- Key login fails: verify the URL, trusted LAN/VPN route, server health, the configured hub key, and Android TLS policy.
- Forecast is not ready: keep the cached client data, verify ingestion/provider connectivity, and do not substitute fabricated values.
- Restore fails: stop ingestion, validate the dump and target database, and use the documented temporary restore path.

## v1.0.0 acceptance record

The first formal release was deployed to `ubuntu-vm` under `~/meteohub/` with
`IMAGE_TAG=1.0.0`. The stable GHCR digest, stable aliases, backup restore,
candidate/stable rollback drill, Android key login and analysis smoke test, and
SHA256 verification are recorded in `docs/ubuntu-vm-deployment.md`. The VM is
LAN/VPN-only on host port `18081`; add a trusted HTTPS reverse proxy or VPN
before allowing connections outside that boundary.
