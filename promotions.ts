/**
 * /promotions routes — list active promotions for the signed-in user and
 * let them join one. Promotions themselves are managed from the admin
 * console.
 */
import { Router, type IRouter } from "express";
import { getUserData, logActivity, promotions } from "../lib/store";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/promotions", requireAuth, (req, res) => {
  const data = getUserData(req.userId!);
  const list = promotions
    .filter((p) => p.active)
    .map((p) => ({ ...p, joined: data.joinedPromotions.has(p.id) }));
  return res.json(list);
});

router.post("/promotions/:promotionId/join", requireAuth, (req, res): unknown => {
  const id = String(req.params["promotionId"] ?? "");
  const promo = promotions.find((p) => p.id === id);
  if (!promo) return res.status(404).json({ error: "Promotion not found" });
  if (!promo.active) return res.status(400).json({ error: "Promotion is no longer active" });
  const data = getUserData(req.userId!);
  if (!data.joinedPromotions.has(id)) {
    data.joinedPromotions.add(id);
    promo.participants += 1;
    logActivity({
      actorId: req.userId!,
      actorName: req.storedUser!.user.fullName,
      action: "promotion.join",
      detail: `Joined promotion "${promo.title}"`,
    });
  }
  return res.json({ ...promo, joined: true });
});

export default router;
