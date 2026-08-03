# Known limitations

- Open-Meteo model coverage, names, retention and rate limits can change. The registry is configuration code and must be reviewed when upstream deprecates a model.
- The current Provider parses hourly normalized data and stores run metadata; a future version should add richer observation adapters, altitude/grid correction, and explicit upstream model-run discovery where available.
- V1 has the durable schema for verification/calibration but only the deterministic bias-calibration core. It needs months of location-specific forecasts and observations before learned weights are useful.
- The current scheduler is single-process. PostgreSQL advisory locking is required before running multiple server replicas.
- The development memory store is not durable and must never be used as a production database.
- Docker/Compose acceptance on the original development machine depends on Docker being installed; CI performs the Docker build.
