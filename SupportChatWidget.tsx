/**
 * SupportChatWidget — Chatway-like floating live support chat
 *
 * Features:
 *  - Visitor ping on first mount (notifies admin via email + alert)
 *  - Sound notification when admin replies
 *  - Browser notification for admin messages
 *  - Admin-initiated session support (authenticated users see admin-started chats)
 *  - Unread badge on floating button
 *  - Visitor welcome form (name + email) for anonymous users
 *  - Polls for new messages every 3s when open, 8s when minimised
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Loader2, User, ChevronDown,
  CheckCheck, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SupportMsg {
  id: string;
  sessionId: string;
  message: string;
  fromAdmin: boolean;
  visitorName: string | null;
  createdAt: string;
}

interface WelcomeForm {
  name: string;
  email: string;
}

interface UserSession {
  sessionId: string;
  status: string;
  hasAdminMessages: boolean;
  messageCount: number;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
const SESSION_KEY = "xpfx_support_session_id";
const VISITOR_KEY = "xpfx_support_visitor";
const PING_KEY = "xpfx_visitor_pinged";

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getStoredVisitor(): WelcomeForm | null {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeVisitor(v: WelcomeForm) {
  try { localStorage.setItem(VISITOR_KEY, JSON.stringify(v)); } catch {}
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Chatway-like helpers
// ---------------------------------------------------------------------------

function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    void ctx.suspend().then(() => ctx.close());
  } catch { /* audio not available */ }
}

function requestBrowserNotification() {
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico", tag: "xpfx-support" });
    } catch { /* ignore */ }
  }
}

function sendVisitorPing(sessionId: string, name?: string, email?: string) {
  const alreadyPinged = sessionStorage.getItem(PING_KEY);
  if (alreadyPinged) return;
  sessionStorage.setItem(PING_KEY, "1");

  fetch("/api/support-chat/visitor-ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      pageUrl: window.location.pathname,
      visitorName: name,
      visitorEmail: email,
    }),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

export function SupportChatWidget() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [showWelcomeForm, setShowWelcomeForm] = useState(false);
  const [visitor, setVisitor] = useState<WelcomeForm | null>(null);
  const [welcomeForm, setWelcomeForm] = useState<WelcomeForm>({ name: "", email: "" });
  const [welcomeSubmitting, setWelcomeSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionReady, setSessionReady] = useState(false);
  const [notifPermAsked, setNotifPermAsked] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevAdminMsgCount = useRef(0);
  const seenIds = useRef(new Set<string>());

  const authUser = (user as { user?: { fullName?: string; email?: string; id?: string } })?.user;

  // ---------------------------------------------------------------------------
  // Initialise session ID + visitor info
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    if (isAuthenticated) {
      setVisitor({ name: authUser?.fullName ?? "User", email: authUser?.email ?? "" });
      setShowWelcomeForm(false);

      // Check for admin-initiated sessions for this user
      fetch("/api/support-chat/my-sessions", { credentials: "include" })
        .then((r) => r.json())
        .then((sessions: UserSession[]) => {
          const adminInitiated = sessions.find(
            (s) => s.hasAdminMessages && s.sessionId !== sid && s.status !== "closed",
          );
          if (adminInitiated) {
            // Switch to admin-initiated session
            setSessionId(adminInitiated.sessionId);
          }
          setSessionReady(false);
        })
        .catch(() => {});
    } else {
      const stored = getStoredVisitor();
      if (stored) {
        setVisitor(stored);
        setShowWelcomeForm(false);
        sendVisitorPing(sid, stored.name, stored.email);
      } else {
        setShowWelcomeForm(true);
        sendVisitorPing(sid);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Ping for authenticated users too
  useEffect(() => {
    if (isAuthenticated && sessionId) {
      sendVisitorPing(sessionId, authUser?.fullName, authUser?.email);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionId]);

  // ---------------------------------------------------------------------------
  // Session initialisation
  // ---------------------------------------------------------------------------
  const initSession = useCallback(async (sid: string, visitorData?: WelcomeForm) => {
    try {
      const body: Record<string, string> = { sessionId: sid };
      if (visitorData?.name) body.visitorName = visitorData.name;
      if (visitorData?.email) body.visitorEmail = visitorData.email;
      if (isAuthenticated) {
        if (authUser?.fullName) body.visitorName = authUser.fullName;
        if (authUser?.email) body.visitorEmail = authUser.email;
      }
      await fetch("/api/support-chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      setSessionReady(true);
    } catch {}
  }, [isAuthenticated, authUser]);

  // ---------------------------------------------------------------------------
  // Fetch messages + detect new admin messages
  // ---------------------------------------------------------------------------
  const fetchMessages = useCallback(async (currentSessionId?: string) => {
    const sid = currentSessionId || sessionId;
    if (!sid || !sessionReady) return;
    try {
      const res = await fetch(`/api/support-chat/messages/${sid}`, { credentials: "include" });
      if (!res.ok) return;
      const msgs: SupportMsg[] = await res.json();

      // Detect new admin messages for notifications
      const adminMsgs = msgs.filter((m) => m.fromAdmin);
      const newAdminMsgs = adminMsgs.filter((m) => !seenIds.current.has(m.id));

      if (newAdminMsgs.length > 0 && prevAdminMsgCount.current > 0) {
        // Play sound + show browser notification
        playNotificationSound();
        const last = newAdminMsgs[newAdminMsgs.length - 1]!;
        if (!open) {
          showBrowserNotification("XpressPro FX Support", last.message);
        }
      }

      // Update seen IDs
      for (const m of adminMsgs) seenIds.current.add(m.id);
      prevAdminMsgCount.current = adminMsgs.length;

      setMessages(msgs);

      // Unread count (admin messages not seen while widget was closed)
      if (!open) {
        setUnreadCount(newAdminMsgs.length > 0 ? (c) => c + newAdminMsgs.length : (c) => c);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionReady, open]);

  // ---------------------------------------------------------------------------
  // Polling — fast when open, slow (background) when minimised
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (bgPollRef.current) clearInterval(bgPollRef.current);

    if (open && sessionReady) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 3000);
    } else if (sessionReady) {
      // Background poll for unread badge
      bgPollRef.current = setInterval(fetchMessages, 8000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (bgPollRef.current) clearInterval(bgPollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionReady]);

  // Init session when chat opens
  useEffect(() => {
    if (open && !sessionReady && sessionId && !showWelcomeForm) {
      const v = visitor ?? getStoredVisitor();
      void initSession(sessionId, v ?? undefined);
    }
  }, [open, sessionReady, sessionId, showWelcomeForm, visitor, initSession]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Mark as read + request notification permission when opened
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      if (!notifPermAsked) {
        setNotifPermAsked(true);
        requestBrowserNotification();
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleWelcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!welcomeForm.name.trim()) return;
    setWelcomeSubmitting(true);

    const v = { name: welcomeForm.name.trim(), email: welcomeForm.email.trim() };
    storeVisitor(v);
    setVisitor(v);
    sendVisitorPing(sessionId, v.name, v.email);
    setShowWelcomeForm(false);
    await initSession(sessionId, v);
    setWelcomeSubmitting(false);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !sessionReady) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const visitorData = visitor ?? getStoredVisitor();
    try {
      const res = await fetch("/api/support-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          message: text,
          visitorName: visitorData?.name,
          visitorEmail: visitorData?.email,
        }),
      });
      if (res.ok) {
        const msg: SupportMsg = await res.json();
        seenIds.current.add(msg.id);
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
    } catch {}
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const toggleOpen = () => {
    setOpen((v) => {
      if (!v) setUnreadCount(0);
      return !v;
    });
  };

  const displayName = isAuthenticated
    ? (authUser?.fullName?.split(" ")[0] ?? "there")
    : visitor?.name?.split(" ")[0] ?? "there";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={toggleOpen}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
      >
        <div className={cn("transition-all duration-300", open ? "scale-90 opacity-80" : "scale-100")}>
          {open ? (
            <ChevronDown className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && !open && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Online indicator */}
        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
      </button>

      {/* ── Chat panel ── */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-[59] w-80 sm:w-[360px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
          open
            ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
            : "opacity-0 scale-95 pointer-events-none translate-y-2",
        )}
        style={{ maxHeight: "min(580px, calc(100vh - 112px))" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
        >
          {/* Avatar cluster */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-emerald-500/30 border-2 border-emerald-500/50 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">XpressPro FX Support</p>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
              Online · Typically replies in minutes
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => requestBrowserNotification()}
              title="Enable notifications"
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white transition-colors ml-1"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Welcome form ── */}
        {showWelcomeForm && open && (
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground text-center mb-1">
              Welcome! How can we help?
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-5">
              Share your details and our team will assist you right away.
            </p>
            <form onSubmit={handleWelcomeSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your Name *</label>
                <input
                  value={welcomeForm.name}
                  onChange={(e) => setWelcomeForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email (optional)</label>
                <input
                  type="email"
                  value={welcomeForm.email}
                  onChange={(e) => setWelcomeForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={welcomeSubmitting || !welcomeForm.name.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90 mt-1"
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
              >
                {welcomeSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                  </span>
                ) : (
                  "Start Conversation →"
                )}
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-4">
              We're available 24/7 · Average response: &lt; 5 minutes
            </p>
          </div>
        )}

        {/* ── Messages area ── */}
        {!showWelcomeForm && (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-background/30 min-h-0">

              {/* Greeting bubble */}
              <div className="flex gap-2 items-end">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <MessageCircle className="w-3 h-3 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[82%]">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">Support Team</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Hi {displayName}! 👋 Welcome to XpressPro FX. How can we help you today?
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Just now</p>
                </div>
              </div>

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 items-end",
                    msg.fromAdmin ? "flex-row" : "flex-row-reverse",
                  )}
                >
                  {msg.fromAdmin && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mb-0.5">
                      <MessageCircle className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 max-w-[82%]",
                      msg.fromAdmin
                        ? "bg-card border border-border rounded-bl-sm"
                        : "rounded-br-sm text-white"
                    )}
                    style={!msg.fromAdmin ? { background: "linear-gradient(135deg, #0f4c81 0%, #10b981 100%)" } : {}}
                  >
                    {msg.fromAdmin && (
                      <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">Support Team</p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                    <div className={cn(
                      "flex items-center gap-1 mt-1",
                      msg.fromAdmin ? "justify-start" : "justify-end",
                    )}>
                      <span className="text-[10px] opacity-60">{timeAgo(msg.createdAt)}</span>
                      {!msg.fromAdmin && <CheckCheck className="w-3 h-3 opacity-50" />}
                    </div>
                  </div>
                </div>
              ))}

              {/* States */}
              {messages.length === 0 && sessionReady && (
                <div className="flex items-center justify-center py-6">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Send a message to start. Our team typically<br />replies within minutes.
                  </p>
                </div>
              )}
              {!sessionReady && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Input bar ── */}
            <div className="flex-shrink-0 px-3 py-3 border-t border-border bg-card">
              <div className="flex gap-2 items-end">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={sessionReady ? "Type your message…" : "Connecting…"}
                  disabled={!sessionReady || sending}
                  className="flex-1 px-3.5 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 transition-colors"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || sending || !sessionReady}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all",
                    input.trim() && !sending
                      ? "opacity-100 hover:opacity-90 active:scale-95"
                      : "opacity-40",
                  )}
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
                XpressPro FX · Secure · Available 24/7
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
