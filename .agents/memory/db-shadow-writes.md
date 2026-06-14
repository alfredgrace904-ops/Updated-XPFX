---
name: DB shadow-writes
description: How Drizzle/Neon writes work alongside the in-memory store
---

All Neon PostgreSQL writes are non-blocking shadow writes — they happen after the in-memory store is already updated and the HTTP response is sent. The in-memory store remains the source of truth for all reads.

**Rule:** Never pass the in-memory `id` field to Drizzle inserts. In-memory IDs use formats like `u_demo_001`, `dep_xxx`, `tx_xxx` which are NOT valid UUIDs. The Postgres schema uses `uuid` primary keys with `defaultRandom()`.

**Why:** If you pass a non-UUID id, the insert will throw a Postgres error. Since `dbRun()` swallows errors, this fails silently — the shadow write is lost but the request succeeds.

**How to apply:**
- `src/lib/db-client.ts` — `getDb()` lazily initialises Drizzle, `dbRun(label, fn)` catches and logs errors
- Use `void dbRun("label", async (db) => { ... })` for fire-and-forget shadow writes
- Omit `id` from all `.values({})` calls — let Postgres auto-generate UUIDs
- `DATABASE_URL` env var — server boots and works without it (DB layer disabled with a warning)
