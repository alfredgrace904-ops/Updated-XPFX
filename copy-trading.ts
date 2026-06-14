/**
 * Copy Trading Routes
 * -------------------
 * Provides the trader marketplace, subscription management, and performance
 * stats for the copy-trading feature.  Trader pool is sourced from the
 * platform's manager list; subscription state is held in an in-memory Map
 * keyed by userId.
 */
import { Router } from "express";
import { requireAuth } from "../lib/session.js";
import { managers } from "../lib/store.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*  Static performance stats seed — admin / owner can extend this             */
/* -------------------------------------------------------------------------- */

interface TraderStats {
  winRate: number;
  monthlyReturnAvg: number;
  maxDrawdown: number;
  followerCount: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  tradingStyle: "aggressive" | "moderate" | "conservative";
  minCopyAmount: number;
  recentMonths: { month: string; return: number }[];
}

const TRADER_STATS_SEED: TraderStats[] = [
  {
    winRate: 0.74,
    monthlyReturnAvg: 4.2,
    maxDrawdown: 8.5,
    followerCount: 1241,
    totalTrades: 3820,
    profitFactor: 2.1,
    sharpeRatio: 1.8,
    tradingStyle: "moderate",
    minCopyAmount: 100,
    recentMonths: [
      { month: "Jan", return: 3.1 },
      { month: "Feb", return: 5.4 },
      { month: "Mar", return: -1.2 },
      { month: "Apr", return: 6.8 },
      { month: "May", return: 4.0 },
      { month: "Jun", return: 5.1 },
    ],
  },
  {
    winRate: 0.81,
    monthlyReturnAvg: 6.7,
    maxDrawdown: 14.2,
    followerCount: 3560,
    totalTrades: 9120,
    profitFactor: 2.8,
    sharpeRatio: 2.3,
    tradingStyle: "aggressive",
    minCopyAmount: 250,
    recentMonths: [
      { month: "Jan", return: 8.2 },
      { month: "Feb", return: -2.4 },
      { month: "Mar", return: 11.5 },
      { month: "Apr", return: 7.0 },
      { month: "May", return: 5.8 },
      { month: "Jun", return: 9.1 },
    ],
  },
  {
    winRate: 0.68,
    monthlyReturnAvg: 2.9,
    maxDrawdown: 4.1,
    followerCount: 890,
    totalTrades: 2210,
    profitFactor: 1.7,
    sharpeRatio: 1.4,
    tradingStyle: "conservative",
    minCopyAmount: 50,
    recentMonths: [
      { month: "Jan", return: 2.2 },
      { month: "Feb", return: 3.8 },
      { month: "Mar", return: 1.5 },
      { month: "Apr", return: 2.9 },
      { month: "May", return: 3.1 },
      { month: "Jun", return: 2.0 },
    ],
  },
  {
    winRate: 0.77,
    monthlyReturnAvg: 5.3,
    maxDrawdown: 10.8,
    followerCount: 2150,
    totalTrades: 6440,
    profitFactor: 2.4,
    sharpeRatio: 2.0,
    tradingStyle: "moderate",
    minCopyAmount: 200,
    recentMonths: [
      { month: "Jan", return: 4.5 },
      { month: "Feb", return: 6.1 },
      { month: "Mar", return: 3.8 },
      { month: "Apr", return: -0.9 },
      { month: "May", return: 7.4 },
      { month: "Jun", return: 6.0 },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  In-memory subscription store                                               */
/* -------------------------------------------------------------------------- */

interface CopySubscription {
  id: string;
  userId: string;
  managerId: string;
  copyAmount: number;
  currency: string;
  subscribedAt: string;
  simulatedPnlPct: number;
}

const subscriptions = new Map<string, CopySubscription[]>(); // userId → subs

function getUserSubs(userId: string): CopySubscription[] {
  if (!subscriptions.has(userId)) subscriptions.set(userId, []);
  return subscriptions.get(userId)!;
}

/* -------------------------------------------------------------------------- */
/*  GET /copy-trading/traders                                                  */
/*  Public-ish — requireAuth so we can attach subscription state              */
/* -------------------------------------------------------------------------- */
router.get("/copy-trading/traders", requireAuth, (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const userSubs = getUserSubs(userId);
  const subManagerIds = new Set(userSubs.map((s) => s.managerId));

  const traders = managers.map((m, idx) => {
    const stats = TRADER_STATS_SEED[idx % TRADER_STATS_SEED.length]!;
    const sub = userSubs.find((s) => s.managerId === m.id);
    return {
      id: m.id,
      name: m.name,
      title: m.title,
      avatarUrl: m.avatarUrl ?? null,
      specialties: m.specialties ?? [],
      winRate: stats.winRate,
      monthlyReturnAvg: stats.monthlyReturnAvg,
      maxDrawdown: stats.maxDrawdown,
      followerCount: stats.followerCount,
      totalTrades: stats.totalTrades,
      profitFactor: stats.profitFactor,
      sharpeRatio: stats.sharpeRatio,
      tradingStyle: stats.tradingStyle,
      minCopyAmount: stats.minCopyAmount,
      recentMonths: stats.recentMonths,
      isFollowing: subManagerIds.has(m.id),
      mySubscription: sub
        ? {
            copyAmount: sub.copyAmount,
            currency: sub.currency,
            subscribedAt: sub.subscribedAt,
            simulatedPnlPct: sub.simulatedPnlPct,
          }
        : null,
    };
  });

  res.json({ traders });
});

/* -------------------------------------------------------------------------- */
/*  GET /copy-trading/my-subscriptions                                        */
/* -------------------------------------------------------------------------- */
router.get("/copy-trading/my-subscriptions", requireAuth, (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const userSubs = getUserSubs(userId);

  const enriched = userSubs.map((sub) => {
    const manager = managers.find((m) => m.id === sub.managerId);
    return {
      ...sub,
      managerName: manager?.name ?? "Unknown",
      managerTitle: manager?.title ?? "",
      managerAvatarUrl: manager?.avatarUrl ?? null,
    };
  });

  res.json({ subscriptions: enriched });
});

/* -------------------------------------------------------------------------- */
/*  POST /copy-trading/subscribe                                              */
/* -------------------------------------------------------------------------- */
router.post("/copy-trading/subscribe", requireAuth, (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const { managerId, copyAmount, currency = "USD" } = req.body as {
    managerId: string;
    copyAmount: number;
    currency?: string;
  };

  if (!managerId || !copyAmount || copyAmount <= 0) {
    res.status(400).json({ error: "managerId and a positive copyAmount are required." });
    return;
  }

  const manager = managers.find((m) => m.id === managerId);
  if (!manager) {
    res.status(404).json({ error: "Trader not found." });
    return;
  }

  const userSubs = getUserSubs(userId);
  if (userSubs.some((s) => s.managerId === managerId)) {
    res.status(409).json({ error: "Already following this trader." });
    return;
  }

  const sub: CopySubscription = {
    id: `csub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    managerId,
    copyAmount: Number(copyAmount),
    currency,
    subscribedAt: new Date().toISOString(),
    simulatedPnlPct: 0,
  };

  userSubs.push(sub);

  res.status(201).json({ message: "Subscribed successfully.", subscription: sub });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /copy-trading/subscribe/:managerId                                 */
/* -------------------------------------------------------------------------- */
router.delete("/copy-trading/subscribe/:managerId", requireAuth, (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const { managerId } = req.params as { managerId: string };

  const userSubs = getUserSubs(userId);
  const idx = userSubs.findIndex((s) => s.managerId === managerId);
  if (idx === -1) {
    res.status(404).json({ error: "Subscription not found." });
    return;
  }

  userSubs.splice(idx, 1);
  res.json({ message: "Unsubscribed successfully." });
});

export default router;
