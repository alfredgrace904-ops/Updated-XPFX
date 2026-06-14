/**
 * Merchant ↔ platform-admin chat helper.
 *
 * The thread is stored inside the merchant's existing /messages thread map
 * under context="p2p_admin", so admin and merchant always see the same
 * Message[] (no parallel store). Messages from the admin are written with
 * isFromUser=false; messages from the merchant with isFromUser=true.
 */
import type { Message } from "@workspace/api-zod";
import { getUserData } from "./store";

export const P2P_ADMIN_CONTEXT = "p2p_admin" as const;
const KEY = P2P_ADMIN_CONTEXT;

/** Returns (and lazily creates) the merchant↔admin Message[] for this user. */
export function merchantAdminThread(merchantUserId: string): Message[] {
  const data = getUserData(merchantUserId);
  let list = data.messages.get(KEY);
  if (!list) {
    list = [];
    data.messages.set(KEY, list);
  }
  return list;
}
