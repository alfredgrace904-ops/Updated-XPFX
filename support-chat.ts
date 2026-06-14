/**
 * Support chat routes — visitor-facing + admin management
 *
 * Uses in-memory store so it works without a DB connection.
 * Sessions are keyed by a random sessionId generated client-side.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../lib/session";
import {
  supportChatMessages,
  supportChatSessions,
  newId,
  NOW,
  users,
} from "../lib/store";
import { pushAdminAlert, notifyUser } from "../lib/notify";

const router: IRouter = Router();

// Visitor ping dedup (transient, not persisted)
const recentPings = new Map<string, number>();
const PING_COOLDOWN_MS = 15 * 60 * 1000; // 15 min

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const CreateSessionBody = z.object({
  sessionId: z.string().min(1),
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  userId: z.string().optional(),
});

const SendMessageBody = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
  visitorName: z.string().optional(),
  visitorEmail: z.string().optional(),
});

const AdminReplyBody = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

const UpdateStatusBody = z.object({
  status: z.enum(["open", "closed", "resolved"]),
});

const VisitorPingBody = z.object({
  sessionId: z.string().optional(),
  pageUrl: z.string().optional(),
  visitorName: z.string().optional(),
  visitorEmail: z.string().optional(),
});

const AdminInitiateBody = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

// ---------------------------------------------------------------------------
// Visitor routes
// ---------------------------------------------------------------------------

// POST /support-chat/session
router.post("/support-chat/session", (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { sessionId, visitorName, visitorEmail, userId } = parsed.data;

  let session = supportChatSessions.get(sessionId);
  if (!session) {
    session = {
      id: newId("scs"),
      sessionId,
      userId: userId ?? req.userId ?? null,
      visitorName: visitorName ?? null,
      visitorEmail: visitorEmail ?? null,
      status: "open",
      lastMessageAt: NOW(),
      createdAt: NOW(),
    };
    supportChatSessions.set(sessionId, session);
  } else {
    if (visitorName) session.visitorName = visitorName;
    if (visitorEmail) session.visitorEmail = visitorEmail;
    if (userId) session.userId = userId;
    if (req.userId && !session.userId) session.userId = req.userId;
  }

  return res.json(session);
});

// POST /support-chat/message
router.post("/support-chat/message", (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { sessionId, message, visitorName, visitorEmail } = parsed.data;

  let session = supportChatSessions.get(sessionId);
  if (!session) {
    session = {
      id: newId("scs"),
      sessionId,
      userId: req.userId ?? null,
      visitorName: visitorName ?? null,
      visitorEmail: visitorEmail ?? null,
      status: "open",
      lastMessageAt: NOW(),
      createdAt: NOW(),
    };
    supportChatSessions.set(sessionId, session);
  } else {
    session.status = session.status === "closed" ? "open" : session.status;
    if (visitorName && !session.visitorName) session.visitorName = visitorName;
    if (visitorEmail && !session.visitorEmail) session.visitorEmail = visitorEmail;
  }

  const msg = {
    id: newId("scm"),
    sessionId,
    userId: req.userId ?? session.userId,
    visitorName: visitorName ?? session.visitorName,
    visitorEmail: visitorEmail ?? session.visitorEmail,
    message,
    fromAdmin: false,
    isRead: false,
    createdAt: NOW(),
  };

  const existing = supportChatMessages.get(sessionId) ?? [];
  existing.push(msg);
  supportChatMessages.set(sessionId, existing);
  session.lastMessageAt = NOW();

  return res.status(201).json(msg);
});

// GET /support-chat/messages/:sessionId
router.get("/support-chat/messages/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const msgs = supportChatMessages.get(sessionId) ?? [];
  return res.json(msgs);
});

// ---------------------------------------------------------------------------
// Admin routes
// ---------------------------------------------------------------------------

// POST /support-chat/admin/reply
router.post("/support-chat/admin/reply", requireAdmin, (req, res) => {
  const parsed = AdminReplyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { sessionId, message } = parsed.data;
  const session = supportChatSessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const adminUser = users.get(req.userId!);
  const msg = {
    id: newId("scm"),
    sessionId,
    userId: req.userId!,
    visitorName: adminUser?.user.fullName ?? "Support",
    visitorEmail: adminUser?.user.email ?? null,
    message,
    fromAdmin: true,
    isRead: false,
    createdAt: NOW(),
  };

  const existing = supportChatMessages.get(sessionId) ?? [];
  existing.push(msg);
  supportChatMessages.set(sessionId, existing);
  session.lastMessageAt = NOW();

  // Mark visitor messages as read
  for (const m of existing) {
    if (!m.fromAdmin) m.isRead = true;
  }

  return res.status(201).json(msg);
});

// GET /support-chat/admin/sessions
router.get("/support-chat/admin/sessions", requireAdmin, (_req, res) => {
  const sessions = [];
  for (const [, session] of supportChatSessions) {
    const msgs = supportChatMessages.get(session.sessionId) ?? [];
    const lastMsg = msgs[msgs.length - 1];
    const unreadCount = msgs.filter((m) => !m.fromAdmin && !m.isRead).length;
    sessions.push({
      ...session,
      unreadCount,
      lastMessagePreview: lastMsg?.message?.slice(0, 80) ?? "",
      messageCount: msgs.length,
    });
  }
  sessions.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
  return res.json(sessions);
});

// PATCH /support-chat/admin/sessions/:sessionId/status
router.patch(
  "/support-chat/admin/sessions/:sessionId/status",
  requireAdmin,
  (req, res) => {
    const { sessionId } = req.params;
    const parsed = UpdateStatusBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const session = supportChatSessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.status = parsed.data.status;
    return res.json(session);
  },
);

// GET /support-chat/admin/sessions/:sessionId/messages
router.get(
  "/support-chat/admin/sessions/:sessionId/messages",
  requireAdmin,
  (req, res) => {
    const { sessionId } = req.params;
    const msgs = supportChatMessages.get(sessionId) ?? [];
    return res.json(msgs);
  },
);

// GET /support-chat/admin/unread-count
router.get("/support-chat/admin/unread-count", requireAdmin, (_req, res) => {
  let total = 0;
  for (const [, msgs] of supportChatMessages) {
    total += msgs.filter((m) => !m.fromAdmin && !m.isRead).length;
  }
  return res.json({ count: total });
});

// POST /support-chat/visitor-ping — Chatway-like: notify admin when visitor arrives
router.post("/support-chat/visitor-ping", (req, res) => {
  const parsed = VisitorPingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { sessionId = "anon", pageUrl, visitorName, visitorEmail } = parsed.data;

  const lastPing = recentPings.get(sessionId);
  if (lastPing && Date.now() - lastPing < PING_COOLDOWN_MS) {
    return res.json({ ok: true, skipped: true });
  }
  recentPings.set(sessionId, Date.now());

  const who = visitorName
    ? ` — ${visitorName}${visitorEmail ? ` <${visitorEmail}>` : ""}`
    : "";
  const where = pageUrl ? ` on ${pageUrl}` : " on the website";

  pushAdminAlert({
    kind: "visitor_arrived",
    title: "New visitor on the site",
    body: `A visitor arrived${where}${who}. They may need support.`,
    severity: "info",
    linkUrl: "/support-chat",
    email: true,
  });

  return res.json({ ok: true });
});

// GET /support-chat/my-sessions — authenticated user sees all their linked sessions (incl. admin-initiated)
router.get("/support-chat/my-sessions", requireAuth, (req, res) => {
  const sessions = [];
  for (const [, session] of supportChatSessions) {
    if (session.userId === req.userId) {
      const msgs = supportChatMessages.get(session.sessionId) ?? [];
      sessions.push({
        ...session,
        messageCount: msgs.length,
        hasAdminMessages: msgs.some((m) => m.fromAdmin),
      });
    }
  }
  sessions.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  return res.json(sessions);
});

// POST /support-chat/admin/initiate — admin starts a fresh conversation with a registered user
router.post("/support-chat/admin/initiate", requireAdmin, (req, res) => {
  const parsed = AdminInitiateBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { userId, message } = parsed.data;
  const targetUser = users.get(userId);
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  const sessionId = newId("sc");
  const session = {
    id: newId("scs"),
    sessionId,
    userId,
    visitorName: targetUser.user.fullName ?? null,
    visitorEmail: targetUser.user.email ?? null,
    status: "open" as const,
    lastMessageAt: NOW(),
    createdAt: NOW(),
  };
  supportChatSessions.set(sessionId, session);

  const adminUser = users.get(req.userId!);
  const msg = {
    id: newId("scm"),
    sessionId,
    userId: req.userId!,
    visitorName: adminUser?.user.fullName ?? "Support",
    visitorEmail: adminUser?.user.email ?? null,
    message,
    fromAdmin: true,
    isRead: false,
    createdAt: NOW(),
  };
  supportChatMessages.set(sessionId, [msg]);

  notifyUser({
    userId,
    kind: "support_reply",
    title: "New message from XpressPro FX Support",
    body: message.slice(0, 100),
    link: "/?openChat=true",
  });

  return res.json({ ...session, messageCount: 1 });
});

// DELETE /support-chat/admin/sessions/:sessionId — permanently delete a conversation
router.delete("/support-chat/admin/sessions/:sessionId", requireAdmin, (req, res) => {
  const { sessionId } = req.params;
  if (!supportChatSessions.has(sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }
  supportChatSessions.delete(sessionId);
  supportChatMessages.delete(sessionId);
  return res.json({ ok: true });
});

// GET /support-chat/admin/users — registered non-admin users for admin to select
router.get("/support-chat/admin/users", requireAdmin, (_req, res) => {
  const userList = [];
  for (const [id, stored] of users) {
    if (stored.user.role !== "admin") {
      userList.push({
        id,
        fullName: stored.user.fullName ?? "Unknown",
        email: stored.user.email,
      });
    }
  }
  userList.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return res.json(userList);
});

export default router;
