# Data model and time semantics

`hub_locations` owns stable UUIDs, coordinates, timezone, optional administrative metadata, alias/order, analysis flag, retention policy, fallback provider, timestamps, and a monotone sync version. `sync_changes` stores ordered upserts and delete tombstones.

`forecast_runs` represents one model publication. `forecast_values` stores one variable at one valid time for that run. `run_at` is model publication/issue time; `fetched_at` is server receipt time; `valid_at` is the time being forecast; `lead_hours` is `valid_at - run_at`, never `valid_at - fetched_at`. `source_version` identifies the upstream response generation or fixture.

The system keeps source snapshots by run identity, not only the latest weather. It is therefore possible to compare two forecasts for the same valid hour and answer whether rain was moved earlier/later or temperature was revised. A later API receipt must not replace the original issue time.

Location-local daily dates are derived with the stored IANA timezone. ISO timestamps in storage and API are UTC. Model availability may shorten the contributing set at longer leads; missing values are omitted rather than converted to zero.
