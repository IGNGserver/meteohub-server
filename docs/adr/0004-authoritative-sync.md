# ADR 0004: Server-authoritative location sync

Status: accepted

Hub locations belong to the server. Clients hold a cursor and apply ordered upserts/deletion tombstones. Local ordinary Breezy locations never enter this sync stream. A version precondition is available for updates; on conflict the client rereads and retries. Hide/favorite is a client concern and is never interpreted as a global delete.
