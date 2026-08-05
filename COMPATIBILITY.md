# MeteoHub compatibility matrix

| Component | Stable release | API | Notes |
| --- | --- | --- | --- |
| MeteoHub Server | 1.1.0 | v1 | CPU-only container, PostgreSQL 16, shared-key authentication |
| MeteoHub Weather | 1.0.2 | v1 | `basic` release flavor, signed universal APK |

The Android client must use the same API major version as the server. Server `1.1.x` and Android `1.0.2` use the shared-key authentication contract; upgrade the server before installing this client when migrating from the retired pairing flow. Patch releases within `1.1.x` preserve the API v1 contract unless the release notes say otherwise.
