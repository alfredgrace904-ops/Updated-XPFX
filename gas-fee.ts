/**
 * Gas fee routes — GET/PATCH /admin/gas-fee, GET /withdrawal/gas-fee.
 *
 * The gas-fee config is now per-action (see store.gasFeeSettings.perAction).
 * The PATCH endpoint accepts a partial body and deep-merges per-action
 * overrides into the existing config so admins can tweak a single
 * action without resending the whole map.
 */
import { Router, type IRouter } from "express";
import { gasFeeSettings, getGasFeePolicy, getUserData } from "../lib/store";
import type { GasFeeActionPolicy } from "../lib/store";
import { requireAdmin, requireAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/admin/gas-fee", requireAdmin, (_req, res) => {
  return res.json(gasFeeSettings);
});

interface PatchActionPolicy {
  enabled?: unknown;
  requiredEthAmount?: unknown;
  defaultFeeAmount?: unknown;
  deadlineSeconds?: unknown;
  description?: unknown;
}

interface PatchBody {
  requiredEthAmount?: unknown;
  enabled?: unknown;
  description?: unknown;
  perAction?: Record<string, PatchActionPolicy>;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

router.patch("/admin/gas-fee", requireAdmin, (req, res) => {
  const body = (req.body ?? {}) as PatchBody;
  const r = num(body.requiredEthAmount);
  if (r !== null) gasFeeSettings.requiredEthAmount = r;
  if (typeof body.enabled === "boolean") gasFeeSettings.enabled = body.enabled;
  if (typeof body.description === "string")
    gasFeeSettings.description = body.description;
  if (body.perAction && typeof body.perAction === "object") {
    for (const [action, override] of Object.entries(body.perAction)) {
      if (!override || typeof override !== "object") continue;
      const existing = gasFeeSettings.perAction[action] ?? getGasFeePolicy(action);
      const merged: GasFeeActionPolicy = {
        ...existing,
        ...(typeof override.enabled === "boolean" ? { enabled: override.enabled } : {}),
        ...(num(override.requiredEthAmount) !== null
          ? { requiredEthAmount: num(override.requiredEthAmount)! }
          : {}),
        ...(num(override.defaultFeeAmount) !== null
          ? { defaultFeeAmount: num(override.defaultFeeAmount)! }
          : {}),
        ...(num(override.deadlineSeconds) !== null
          ? { deadlineSeconds: Math.floor(num(override.deadlineSeconds)!) }
          : {}),
        ...(typeof override.description === "string"
          ? { description: override.description }
          : {}),
      };
      gasFeeSettings.perAction[action] = merged;
    }
  }
  return res.json(gasFeeSettings);
});

router.get("/withdrawal/gas-fee", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const policy = getGasFeePolicy("withdrawal");
  const ethWallet = data.connectedWallets.find(
    (w) =>
      w.currency?.toUpperCase() === "ETH" ||
      w.walletType?.toUpperCase().includes("ETH"),
  );
  const userEthBalance = ethWallet?.balance ?? 0;
  const sufficient = !policy.enabled || userEthBalance >= policy.requiredEthAmount;

  return res.json({
    enabled: policy.enabled,
    requiredEthAmount: policy.requiredEthAmount,
    userEthBalance,
    sufficient,
    message: sufficient
      ? "Gas fee requirement met. You may proceed with withdrawal."
      : `Insufficient ETH for gas fees. You need at least ${policy.requiredEthAmount} ETH in a connected wallet to withdraw. Please deposit ETH to continue.`,
  });
});

export default router;
