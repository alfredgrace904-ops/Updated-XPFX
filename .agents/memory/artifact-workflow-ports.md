---
name: Artifact workflow ports
description: How Replit assigns ports to artifact-managed workflows and how vite.config.ts must handle this.
---

## Rule
Never call `configureWorkflow` on artifact-managed workflows — it throws `PROHIBITED_ACTION`. Never write `process.env.PORT` as a required variable in vite.config.ts for artifact frontends.

**Why:** Replit's artifact system overrides the PORT env var for each artifact's workflow process, regardless of the shared `[userenv]` settings:
- `artifacts/api-server` → PORT stays at the shared value (8080 in this project)
- `artifacts/nextrade` → PORT is overridden to 25849 (maps to external 3000)
- `artifacts/admin-portal` → PORT is overridden to 25580 (maps to external 3002)

The override only happens for artifact-managed workflows; the API server's workflow uses the shared PORT=8080.

**How to apply:**
- In `vite.config.ts` for frontends, use PORT directly (Replit will inject the correct per-artifact value). Do NOT add `!== "8080"` guards or fallback logic that would prevent Replit's injected port from being used.
- If the shared env has PORT=8080 and a frontend accidentally reads it, the frontend would conflict with the API server. The safer pattern is to let the Replit artifact system set PORT per-process.
- The `screenshot` tool (`type=app_preview`) may return `ERR_CONNECTION_REFUSED` for artifact-managed workflows — this is a tooling limitation, not an app bug. Verify with `curl localhost:<assigned-port>/` instead.
- To kill an orphaned process blocking a port: `kill -9 $(lsof -ti :<port>)` or `fuser -k <port>/tcp`. After deleting a workflow, its process may remain alive and must be killed manually.
