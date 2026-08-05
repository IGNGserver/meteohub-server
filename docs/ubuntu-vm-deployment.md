# ubuntu-vm deployment record

This file records only non-secret deployment facts. Passwords, tokens, private keys, and private proxy details are intentionally excluded.

## Pre-deployment baseline

- SSH alias: `ubuntu-vm`
- OS: Ubuntu 26.04 LTS
- Architecture: `x86_64`
- Capacity observed before deployment: 12 CPUs, approximately 11 GiB RAM, approximately 43 GiB free on `/`
- Docker Engine: 29.1.3
- Docker Compose: 2.40.3
- Time synchronization: enabled
- Existing services: multiple Docker Compose applications and an Nginx service; no `/opt/meteohub` directory existed
- Existing loopback use of port 8080: present; the deployment therefore uses a separate host port and does not stop or modify the existing service
- No trusted public domain/HTTPS endpoint was identified during the baseline check; deployment is LAN/VPN-only unless a trusted reverse proxy is configured later

## Deployment and acceptance

The VM account cannot currently write `/opt` and `sudo -n` is unavailable, so the legal user-owned fallback is `~/meteohub/`. Existing services were not changed.

Candidate verification completed on 2026-08-03:

- Candidate tag: `ghcr.io/igngserver/meteohub-server:candidate-1.0.0`
- Multi-architecture candidate index digest: `sha256:69e6bbbcb2fee54d9193bb2cfd5c5d0cb41c8d139015116c6430b327a01ebc8e`
- Candidate host port: `18081`, LAN/VPN-only; no public HTTPS exposure
- Candidate checks passed: `GET /api/v1/health`, API v1 version, unauthenticated 401, pairing, location CRUD, city candidates, source listing, real Open-Meteo fetch, composite forecast, analysis, normal Compose restart persistence, migration rerun, custom-format backup, and restore into a temporary PostgreSQL database
- The VM initially encountered GHCR layer throttling, so the identical amd64 workflow archive was used as a verified fallback. A subsequent direct pull of `ghcr.io/igngserver/meteohub-server:1.0.0` succeeded and returned the formal digest below; no source build was used.
- This VM has no passwordless sudo, so a Docker daemon restart/host-reboot simulation is pending authorization. Normal Compose restart and data persistence were verified. An explicit `docker kill` left the container stopped, which is expected for an operator-requested stop under `restart: unless-stopped`; it is not evidence of daemon-failure recovery. The service was restored with the exact release Compose file.

## Formal v1.0.0 deployment

- Release tag: `v1.0.0`, annotated tag points to server commit `57513a808c4ad94824df39ea1874789754bce071`
- Stable image: `ghcr.io/igngserver/meteohub-server:1.0.0`
- Stable multi-architecture digest: `sha256:32d089b5546f38a9a9bd3be215a4ad8e2c10f3cc50b9cf560d672f94f5806a53`
- Stable aliases verified to resolve to the same digest: `1.0.0`, `1.0`, `1`, `latest`
- Stable amd64 archive was checksum-verified from the Draft Release and loaded on the VM; a subsequent direct pull of the exact stable tag also succeeded with the same digest. No source checkout was built
- Deployment directory: `~/meteohub/` (the requested `/opt/meteohub/` path is not writable by this account without an unavailable sudo password)
- Image tag pinned in production `.env`: `IMAGE_TAG=1.0.0`
- Listener: Docker publishes `0.0.0.0:18081` and `[::]:18081`; it is documented and used as LAN/VPN-only because no trusted public HTTPS endpoint is available
- Stable `GET /api/v1/health` and version checks passed; the intentionally unversioned `/health` path returns 404; unauthenticated location access returned `401`
- Candidate data survived the stable upgrade, stable container restart, candidate rollback, and final stable re-upgrade: two test devices and one test location remained present
- Stable backup `backups/stable-1.0.0.dump` was restored into a temporary PostgreSQL database and verified with two devices and one location, then the temporary database was removed
- The Android signed Release APK paired through the LAN tunnel, synced the test location, and opened the stable analysis endpoint successfully after the stable upgrade
- The only migration in this first release is `drizzle/0000_initial.sql`; empty-schema migration and rerun/idempotency passed. There is no earlier MeteoHub schema version to exercise as a distinct upgrade
- Rollback drill passed: candidate `candidate-1.0.0` → stable `1.0.0` → candidate `candidate-1.0.0` → stable `1.0.0`, with health and data checks at each image switch
- Compose restart and recovery were verified. A Docker daemon or host reboot was not performed because `sudo -n` is unavailable and restarting Docker could affect unrelated VM services; this remains an operator-authorized follow-up. The Compose `unless-stopped` policy is retained so services that were running before a daemon restart can be restored, but that behavior is not claimed as tested here.

## Post-deployment secret rotation

The production database password and `TOKEN_PEPPER` were rotated after deployment without recording their values. The database role password was synchronized through the local PostgreSQL socket, the server container was force-recreated from the exact `1.0.0` image, and network authentication was verified with both the current password and a deliberately wrong password. Changing `TOKEN_PEPPER` invalidates existing device tokens; the signed Android Release app was paired again through the trusted LAN tunnel and successfully synced the test location afterward. Unused test pairing codes were expired, and the two pre-rotation test devices were revoked, leaving one active test device. A post-rotation backup restored successfully into a temporary database with three device rows, one hub location, and one sync change.

Do not run `docker compose config` into a terminal transcript or CI artifact: it renders interpolated database URLs and secrets. Use redacted status checks instead. For future rotation, update `.env`, synchronize the `meteohub` PostgreSQL role password, force-recreate the server container, verify `GET /api/v1/health` and an authenticated request, and plan a re-pair for every device when `TOKEN_PEPPER` changes.

## Shared-key authentication migration

Completed on 2026-08-05 for the personal `ubuntu-vm` installation:

- A no-secret source archive was built on the VM as `ghcr.io/igngserver/meteohub-server:shared-key-20260805`.
- The existing PostgreSQL data volume and host listener `18081` were preserved.
- A custom-format backup was created at `~/meteohub/backups/pre-shared-key-20260805.dump` before replacement.
- The deployment `.env` now contains a permission-restricted shared `HUB_ACCESS_KEY`; the value is intentionally not recorded here.
- The previous Compose file and `.env` remain as `compose.before-shared-key-20260805.yml` and `.env.before-shared-key-20260805` for rollback.
- Migration output reported the database up to date. Health returned `200`, unauthenticated locations returned `401`, authenticated locations returned `200`, and the retired `/api/v1/pair` and `/api/v1/devices` routes returned `404`.
- A normal server-container restart completed and the authenticated locations check returned `200` afterward.
