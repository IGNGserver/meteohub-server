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

The final release commit will append the exact image digest, host port, health/pairing/persistence/backup/restore/restart/rollback results, and timestamps here after those checks are actually completed. An item is not considered successful until the command output is recorded in this file and in the final report.
