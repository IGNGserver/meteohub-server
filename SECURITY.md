# Security

MeteoHub is single-user, not multi-tenant. A device token is a bearer credential. The database stores only a SHA-256 hash combined with the private `TOKEN_PEPPER`; plaintext tokens are returned only once during pairing. Pairing codes are one-time, short-lived (default ten minutes), and stored hashed.

Keep `.env`, database URLs, backups, and reverse-proxy private keys out of Git. Rotate `TOKEN_PEPPER` only as a deliberate credential reset because existing device tokens become invalid. Revoke lost devices immediately. Use HTTPS or a private VPN for all traffic outside a trusted isolated LAN. Never turn off TLS certificate verification in Android or a proxy.

The bootstrap pairing endpoint is intentionally available only while no device exists. After the first pairing, creating another code requires an existing device token. The server has no password reset or remote admin account; physical/server access remains part of the trust model.

The API rejects malformed coordinates, timezones, UUIDs, names, cursors, and settings using Zod. CORS is disabled by default. Helmet is enabled. Provider responses are parsed into an allow-listed variable set; arbitrary upstream JSON is not exposed as a trusted forecast.
