# Backup and restore

Back up PostgreSQL with the included scripts or a scheduled host job:

```bash
DATABASE_URL=postgres://meteohub:...@localhost:5432/meteohub \
  BACKUP_FILE=backups/meteohub-$(date +%F).dump pnpm run backup
```

The script uses `pg_dump --format=custom --no-owner`. Restore only into a controlled target after verifying the file and stopping ingestion:

```bash
DATABASE_URL=postgres://meteohub:...@localhost:5432/meteohub \
  BACKUP_FILE=backups/meteohub-2026-08-03.dump pnpm run restore
```

`pg_restore --clean --if-exists` can remove objects in the target database. Confirm the target database is the intended MeteoHub database before running it; never point it at an unrelated database. After restore, run `pnpm run db:verify`, start the server, check `/api/v1/health`, list locations with the hub access key, and test one forecast request.

Raw forecast values default to 365 days. The cleanup command below deletes old raw values while retaining daily verification aggregates and calibration parameters. Run it from an external scheduler and monitor disk usage.

The one-shot cleanup command is available for a host scheduler:

```bash
DATABASE_URL=postgres://meteohub:...@localhost:5432/meteohub \
  RAW_RETENTION_DAYS=365 pnpm run db:cleanup
```

It deletes only old forecast values whose valid time is also old, then removes orphaned runs, old observations, and ingestion job records older than 90 days. Verification scores and calibration parameters are retained.
