# MeteoHub compatibility matrix

| Component | Stable release | API | Notes |
| --- | --- | --- | --- |
| MeteoHub Server | 1.0.0 | v1 | CPU-only container, PostgreSQL 16 |
| MeteoHub Weather | 1.0.0 | v1 | `basic` release flavor, signed universal APK |

The Android client must use the same API major version as the server. Patch releases within server `1.0.x` preserve the API v1 contract unless the release notes say otherwise. A server upgrade is recommended before upgrading the client when the client release notes require a newer patch.
