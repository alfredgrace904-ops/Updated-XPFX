/**
 * Universal gas-fee gate. Every money-movement endpoint (deposit,
 * transfer, trade open, asset purchase, withdrawal, p2p_order) must
 * call `enforceGasFee(req, res, action)` before mutating balances.
 *
 * Each action has its own policy (`getGasFeePolicy(action)`). The
 * caller passes an action name; the gate looks up the per-action
 * required ETH balance and enabled flag — falling back to the global
 * default when no per-action override exists. The user must hold at
 * least that much ETH across their connected wallets, otherwise the
 * request is rejected with HTTP 402.
 */
import type { Request, Response } from "express";
import { getGasFeePolicy, getUserData } from "./store";

export interface GasFeeGateResult {
  ok: boolean;
  required: number;
  have: number;
  action: string;
  reason?: string;
}

export function checkGasFee(userId: string, action: string): GasFeeGateResult {
  const policy = getGasFeePolicy(action);
  if (!policy.enabled) {
    return { ok: true, required: 0, have: 0, action };
  }
  const data = getUserData(userId);
  const have = data.connectedWallets
    .filter(
      (w) =>
        w.currency?.toUpperCase() === "ETH" ||
        w.walletType?.toUpperCase().includes("ETH"),
    )
    .reduce((sum, w) => sum + (w.balance ?? 0), 0);
  if (have >= policy.requiredEthAmount) {
    return { ok: true, required: policy.requiredEthAmount, have, action };
  }
  return {
    ok: false,
    required: policy.requiredEthAmount,
    have,
    action,
    reason: `Insufficient ETH for the ${action} gas fee. You need at least ${policy.requiredEthAmount} ETH in a connected wallet to perform this action. You currently have ${have} ETH.`,
  };
}

/**
 * Express helper. Returns true when the request may proceed, false when
 * it has already responded with 402.
 */
export function enforceGasFee(req: Request, res: Response, action: string): boolean {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return false;
  }
  const check = checkGasFee(userId, action);
  if (check.ok) return true;
  res.status(402).json({
    success: false,
    code: "gas_fee_required",
    action,
    required: check.required,
    have: check.have,
    message: check.reason,
  });
  return false;
}
