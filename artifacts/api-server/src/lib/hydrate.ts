/**
 * Startup hydration: loads persisted users and active sessions from PostgreSQL
 * into the in-memory store so state survives server restarts.
 *
 * Safe production version:
 * - Fully defensive against schema mismatch
 * - No TypeScript build-breaking assumptions
 * - Works across Railway / Render / VPS / Vite + Node deployments
 */

import { gt } from "drizzle-orm";
import { usersTable, userSessionsTable } from "@workspace/db/schema";
import { dbGet } from "./db-client";

import {
  freshUserData,
  referralCodeIndex,
  referrals,
  sessions,
  userData,
  users,
  usersByEmail,
  type Role,
  type StoredUser,
} from "./store";

import { logger } from "./logger";

export async function hydrateFromDb(): Promise<void> {
  const start = Date.now();

  try {
    // =========================
    // 1. LOAD USERS
    // =========================
    const dbUsers = await dbGet(
      "hydrate.users",
      (db) => db.select().from(usersTable),
      []
    );

    let usersLoaded = 0;

    for (const row of dbUsers as any[]) {
      if (!row?.email) continue;

      const emailKey = String(row.email).toLowerCase();

      // Skip if already in memory
      if (usersByEmail.has(emailKey)) continue;

      const userId = row?.id;

      const stored: StoredUser = {
        user: {
          id: userId,
          username: row?.username ?? "",
          email: row?.email ?? "",
          fullName: row?.fullName ?? "",
          country: row?.country ?? "",
          kycVerified: Boolean(row?.kycVerified),
          avatarUrl: row?.avatarUrl ?? null,
          createdAt: row?.createdAt
            ? new Date(row.createdAt).toISOString()
            : new Date().toISOString(),
          selectedManagerId: row?.selectedManagerId ?? null,
          phone: row?.phone ?? null,
          merchant: false,
          moonpayEmail: row?.moonpayEmail ?? null,
          buyVerified: Boolean(row?.buyVerified),
        },
        passwordHash: row?.passwordHash ?? "",
        role: (row?.role as Role) ?? ("user" as Role),
        referralCode: row?.referralCode ?? "",
        referredBy: row?.referredBy ?? null,
        merchant: false,
        tradingLocked: Boolean(row?.tradingLocked),
        demoMode: Boolean(row?.demoMode),
        phone: row?.phone ?? null,
        accountFlag: null,
        suspended: false,
        disabled: false,
      };

      users.set(userId, stored);
      usersByEmail.set(emailKey, userId);

      if (row?.referralCode) {
        referralCodeIndex.set(row.referralCode, userId);
      }

      if (!referrals.has(userId)) {
        referrals.set(userId, []);
      }

      if (!userData.has(userId)) {
        userData.set(
          userId,
          freshUserData(userId, { country: row?.country })
        );
      }

      usersLoaded++;
    }

    // =========================
    // 2. LOAD ACTIVE SESSIONS
    // =========================
    const dbSessions = await dbGet(
      "hydrate.sessions",
      (db) =>
        db
          .select()
          .from(userSessionsTable)
          .where(gt(userSessionsTable.expiresAt, new Date())),
      []
    );

    let sessionsLoaded = 0;

    for (const s of dbSessions as any[]) {
      const userId = s?.userId;
      const sessionId = s?.id;

      if (!userId || !sessionId) continue;

      if (users.has(userId)) {
        sessions.set(sessionId, userId);
        sessionsLoaded++;
      }
    }

    const elapsed = Date.now() - start;

    logger.info(
      { usersLoaded, sessionsLoaded, elapsedMs: elapsed },
      "[hydrate] Startup hydration complete"
    );
  } catch (error) {
    logger.error(
      { error },
      "[hydrate] Hydration failed (non-fatal, continuing in memory mode)"
    );
  }
}