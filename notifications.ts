/**
 * /notifications routes — user-facing in-app notification inbox.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/session";
import { userNotifications } from "../lib/store";

const router: IRouter = Router();

router.get("/notifications", requireAuth, (req, res) => {
  const list = userNotifications.get(req.userId!) ?? [];
  return res.json(list);
});

router.post("/notifications/read-all", requireAuth, (req, res) => {
  const list = userNotifications.get(req.userId!) ?? [];
  for (const n of list) n.read = true;
  return res.json({ success: true, message: "All notifications marked read." });
});

router.post("/notifications/:notificationId/read", requireAuth, (req, res) => {
  const id = String(req.params["notificationId"] ?? "");
  const list = userNotifications.get(req.userId!) ?? [];
  const note = list.find((n) => n.id === id);
  if (!note) return res.status(404).json({ error: "Notification not found" });
  note.read = true;
  return res.json({ success: true, message: "Notification marked read." });
});

export default router;
