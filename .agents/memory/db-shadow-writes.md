---
name: DB shadow-writes
description: How PostgreSQL persistence works alongside the in-memory store — patterns, constraints, and startup hydration
---

All PostgreSQL writes are non-blocking shadow writes — the in-memory store is updated first, the HTTP response is sent, then DB persists asynchronously. In-memory is the source of truth for all reads.

**Core helper**: `artifacts/api-server/src/lib/db-client.ts`
- `getDb()` — lazy pool init (no-op + warn if DATABASE_URL not set)
- `dbRun(label, fn)` — fire-and-forget, errors logged but never thrown
- `dbGet(label, fn, fallback)` — awaited read with typed fallback

**UUID rule**: Never pass in-memory IDs to Drizzle inserts. In-memory IDs use formats like `u_demo_001`, `w_xxx`, `tx_xxx` — NOT valid UUIDs. The Postgres schema uses `uuid` primary keys with `defaultRandom()`.

**Why:** Passing a non-UUID string to a `uuid` column raises a Postgres error. Since `dbRun()` swallows errors, this fails silently — the shadow write is lost but the request succeeds.

**How to apply:**
- Regular users created via signup: `randomUUID()` from `node:crypto` — both in-memory and DB get the same UUID
- Seeded users (demo, admin, legacy): non-UUID IDs — guarded by `UUID_RE.test(id)` before any DB write
- Omit `id` from `.values({})` when the in-memory ID is a legacy non-UUID — let Postgres auto-generate
- Import path for schema: `@workspace/db/schema` (NOT `@workspace/db` — that throws on import if DATABASE_URL is missing)

**Startup hydration**: `artifacts/api-server/src/lib/hydrate.ts`
- Called in `index.ts` before `app.listen()`
- Loads users and active sessions from DB into in-memory maps
- Skips rows whose email is already in `usersByEmail` (protects seeded admin/demo users)
- Only restores sessions with `expiresAt > now()`
- Non-fatal: errors are caught and logged; server continues in-memory-only

**Schema push**: Run `cd lib/db && DATABASE_URL="$DATABASE_URL" npx drizzle-kit push --config ./drizzle.config.ts --force` to sync schema to DB.

**`pg` package**: Must be a direct dep of `@workspace/api-server` AND listed as external in `build.mjs`. Reason: esbuild can't resolve transitive deps (pg is in lib/db, not api-server directly) without it being a direct dep. Marking external means pg is `require()`d at runtime from node_modules.

**What persists today:**
- User accounts (signup via OTP verify-otp route)
- User sessions (login, logout — survives server restart)
- Admin-created users (via `createUser()` in store.ts)

**What does NOT persist yet (next phase):**
- Wallet balances
- Transactions / deposits / withdrawals
- Trades
- P2P orders
