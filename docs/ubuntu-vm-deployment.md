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
- Candidate checks passed: health, API v1 version, unauthenticated 401, pairing, location CRUD, city candidates, source listing, real Open-Meteo fetch, composite forecast, analysis, container restart persistence, migration rerun, custom-format backup, and restore into a temporary PostgreSQL database
- The VM's direct GHCR layer download is severely throttled. The identical amd64 build exported by the GHCR publishing workflow was transferred and loaded with its GHCR image tag; no source build was used. Direct GHCR pull remains a network limitation to resolve before relying on pull-only recovery on this VM.
- This VM has no passwordless sudo, so a Docker daemon restart/host-reboot simulation is pending authorization. Container restart and Compose restart were verified.

The formal stable version and rollback checks will be appended after the signed Android and server Release workflows complete. An item is not considered successful until the command output is recorded here and in the final report.
