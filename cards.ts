/**
 * /cards routes — request, list, edit and cancel branded XpressPro FX
 * payment cards. New requests start in `pending` status; an admin must
 * approve them before the card becomes spendable.
 */
import { Router, type IRouter } from "express";
import {
  RequestCardBody,
  UpdateCardDesignBody,
  type BrokerCard,
} from "@workspace/api-zod";
import { getUserData, logActivity, newId, NOW } from "../lib/store";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

function generatePan(brand: BrokerCard["brand"]): string {
  // Brand-prefixed 16-digit demo PAN. Not a valid Luhn — never use for real.
  const prefixes: Record<BrokerCard["brand"], string> = {
    visa: "4539",
    mastercard: "5412",
    amex: "3782",
    xpresspro: "9911",
  };
  const prefix = prefixes[brand];
  let rest = "";
  for (let i = 0; i < 16 - prefix.length; i++) rest += Math.floor(Math.random() * 10);
  return `${prefix}${rest}`;
}

function generateExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 4);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}


router.get("/cards", requireAuth, (req, res) => {
  return res.json(getUserData(req.userId!).cards);
});

router.post("/cards", requireAuth, (req, res): unknown => {
  const parsed = RequestCardBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid card request", details: parsed.error.issues });
  }
  const data = getUserData(req.userId!);
  if (data.cards.filter((c) => c.status !== "cancelled" && c.status !== "rejected").length >= 3) {
    return res.status(400).json({ error: "You can hold up to 3 active cards." });
  }
  const pan = generatePan(parsed.data.brand);
  const card: BrokerCard = {
    id: newId("card"),
    userId: req.userId!,
    type: parsed.data.type,
    brand: parsed.data.brand,
    status: "pending",
    currency: parsed.data.currency,
    last4: pan.slice(-4),
    expiry: generateExpiry(),
    holderName: req.storedUser!.user.fullName.toUpperCase(),
    spendLimit: parsed.data.type === "credit" ? (parsed.data.creditLimit ?? 5000) : 10000,
    creditLimit: parsed.data.type === "credit" ? (parsed.data.creditLimit ?? 5000) : null,
    balance: 0,
    design: parsed.data.design,
    rejectionReason: null,
    createdAt: NOW(),
    approvedAt: null,
  };
  data.cards.unshift(card);
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "card.request",
    detail: `Requested ${card.type} card (${card.brand}) ending ${card.last4}`,
  });
  return res.status(201).json(card);
});

router.patch("/cards/:cardId", requireAuth, (req, res): unknown => {
  const parsed = UpdateCardDesignBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
  }
  const data = getUserData(req.userId!);
  const card = data.cards.find((c) => c.id === req.params["cardId"]);
  if (!card) return res.status(404).json({ error: "Card not found" });
  if (card.status === "cancelled") {
    return res.status(400).json({ error: "Cannot edit a cancelled card" });
  }
  card.design = parsed.data.design;
  if (parsed.data.holderName) card.holderName = parsed.data.holderName.toUpperCase();
  return res.json(card);
});

router.delete("/cards/:cardId", requireAuth, (req, res): unknown => {
  const data = getUserData(req.userId!);
  const card = data.cards.find((c) => c.id === req.params["cardId"]);
  if (!card) return res.status(404).json({ error: "Card not found" });
  card.status = "cancelled";
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "card.cancel",
    detail: `Cancelled ${card.type} card ending ${card.last4}`,
  });
  return res.json({ success: true, message: "Card cancelled." });
});

export default router;
