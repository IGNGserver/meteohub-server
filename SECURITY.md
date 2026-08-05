# Security

MeteoHub is single-user, not multi-tenant. The configured `HUB_ACCESS_KEY` is the shared bearer credential for every client. It is kept in the server environment, never stored in PostgreSQL, and compared in constant time. Android stores the key in Android Keystore-backed encrypted storage.

Keep `.env`, database URLs, backups, and reverse-proxy private keys out of Git. Rotate `HUB_ACCESS_KEY` as a deliberate credential reset because it invalidates every client at once. Use HTTPS or a private VPN for all traffic outside a trusted isolated LAN. Never turn off TLS certificate verification in Android or a proxy.

There is no user account, device registry, pairing endpoint, password reset, or remote admin account; physical/server access remains part of the trust model. Anyone who knows the hub key can modify authoritative hub locations, so protect the key and the network boundary accordingly.

The API rejects malformed coordinates, timezones, UUIDs, names, cursors, and settings using Zod. CORS is disabled by default. Helmet is enabled. Provider responses are parsed into an allow-listed variable set; arbitrary upstream JSON is not exposed as a trusted forecast.
