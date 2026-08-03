# Third-party notices and research record

## MeteoCompare

- Source: https://github.com/Flowm/meteocompare
- Reviewed commit: `70cc64b2e64e715f1626ec186627801428af04da` (2026-08-03)
- License: MIT
- Copyright notice required by upstream: `Copyright (c) 2026 Florian Mauracher`

No MeteoCompare source file was copied into this repository. The MeteoHub implementations are rewrites of the following domain ideas after reading the upstream tests and documentation: model registry/coverage, regional and lead-time weights, circular wind averaging, WMO severity grouping, inter-model spread, effective family count, conservative verification and sample-gated calibration. The Vue components, localStorage stores, browser service worker, frontend fetch clients, and frontend-only architecture were not reused. This is marked as **rewritten / algorithmic reference**, not direct copy or modified upstream code.

For completeness, the MIT permission notice from the reviewed upstream is preserved here:

```text
MIT License

Copyright (c) 2026 Florian Mauracher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## Breezy Weather reference

- Source: https://github.com/breezy-weather/breezy-weather
- Reviewed commit: `eda0d87e0db9084d3d9ab599e3f9dd2ca1d897fd` (main)
- License: GNU LGPL-3.0; no Breezy source is copied or linked into the server.

We read the `Current`, `Hourly`, `Daily`, `WeatherResult`, `WeatherSource`, and Open-Meteo source declarations to design an ordinary weather-client shape. Phase 1 does not modify, fork, or publish the Android client.

## Runtime dependencies

Runtime dependencies retain their respective licenses in the npm lockfile. Open-Meteo is an external service and its terms, rate limits, model availability, and attribution requirements must be checked before a public deployment.

Open-Meteo research references used for the Provider boundary: https://open-meteo.com/en/docs/historical-weather-api, https://open-meteo.com/en/docs/previous-runs-api, and https://open-meteo.com/en/docs/single-runs-api. These are documentation references, not copied code.
