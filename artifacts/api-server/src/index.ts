import app from "./app";
import { adminSeedStatus } from "./lib/store";
import { logger } from "./lib/logger";
import { startSweeper } from "./lib/sweeper";
import { assertRequiredEnv } from "./lib/env";
import { hydrateFromDb } from "./lib/hydrate";

const { port } = assertRequiredEnv();

if (adminSeedStatus.provisioned) {
  logger.info(
    { adminEmail: adminSeedStatus.email },
    "[admin] Admin account provisioned from environment.",
  );
} else {
  logger.warn(
    { reason: adminSeedStatus.reason },
    "[admin] No admin account provisioned. Set ADMIN_EMAIL and ADMIN_PASSWORD as Replit Secrets to enable admin login.",
  );
}

// Hydrate in-memory store from DB before accepting requests.
// Errors here are non-fatal — the server falls back to in-memory-only mode.
hydrateFromDb()
  .catch((err: Error) => {
    logger.warn({ err: err.message }, "[hydrate] Startup hydration failed — continuing with in-memory only");
  })
  .finally(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      startSweeper();
    });
  });
