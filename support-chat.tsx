/**
 * Admin Support Chat Page — Chatway-like
 * Two-panel layout: session list on left, active conversation on right.
 *
 * Admin capabilities:
 *  - View all visitor/user conversations
 *  - Reply to any conversation
 *  - Change status: open / closed / resolved
 *  - Initiate a new conversation with any registered user
 *  - Delete a conversation permanently
 *  - Real-time polling (sessions every 5s, messages every 3s)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Send, Loader2, CheckCheck, Clock,
  User, RefreshCw, Plus, Trash2, X, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SupportSession {
  id: string;
  sessionId: string;
  userId: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  status: "open" | "closed" | "resolved";
  lastMessageAt: string;
  createdAt: string;
  unreadCount: number;
  lastMessagePreview: string;
  messageCount: number;
}

interface SupportMsg {
  id: string;
  sessionId: string;
  message: string;
  fromAdmin: boolean;
  visitorName: string | null;
  createdAt: string;
}

interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
}

type FilterTab = "all" | "open" | "resolved";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-500/10 text-green-400 border-green-500/30",
  closed: "bg-muted text-muted-foreground border-border",
  resolved: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

// ---------------------------------------------------------------------------
// Session List Item
// ---------------------------------------------------------------------------

function SessionItem({
  session, isActive, onClick,
}: {
  session: SupportSession; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 border-b border-border transition-colors hover:bg-muted/50",
        isActive ? "bg-primary/10 border-l-2 border-l-primary" : "",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-sm font-medium text-foreground truncate">
              {session.visitorName ?? "Anonymous Visitor"}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {session.unreadCount > 0 && (
                <span className="w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {session.unreadCount > 9 ? "9+" : session.unreadCount}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{timeAgo(session.lastMessageAt)}</span>
            </div>
          </div>
          {session.visitorEmail && (
            <p className="text-[11px] text-muted-foreground truncate mb-0.5">{session.visitorEmail}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{session.lastMessagePreview || "No messages yet"}</p>
          <div className="mt-1">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border capitalize font-medium", STATUS_STYLES[session.status])}>
              {session.status}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// New Conversation Modal
// ---------------------------------------------------------------------------

function NewConversationModal({
  onClose, onCreated,
}: {
  onClose: () => void; onCreated: () => void;
}) {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/support-chat/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then((data: RegisteredUser[]) => setUsers(data))
      .catch(() => setError("Failed to load users."));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSend = async () => {
    if (!selectedUser || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support-chat/admin/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: selectedUser.id, message: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to send.");
        setSending(false);
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Network error.");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">New Conversation</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User search */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <label className="text-xs font-medium text-muted-foreground block mb-2">Select a registered user:</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No users found.</p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                  selectedUser?.id === u.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <p className="text-sm font-medium text-foreground">{u.fullName}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </button>
            ))
          )}
        </div>

        {/* Message */}
        <div className="px-5 pb-4 border-t border-border pt-3 flex-shrink-0 space-y-3">
          {selectedUser && (
            <div className="text-xs text-muted-foreground">
              Sending to: <strong className="text-foreground">{selectedUser.fullName}</strong> ({selectedUser.email})
            </div>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your opening message…"
            rows={3}
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleSend}
            disabled={!selectedUser || !message.trim() || sending}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Send & Start Conversation</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function SupportChatPage() {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null);
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [totalUnread, setTotalUnread] = useState(0);
  const [showNewConv, setShowNewConv] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/support-chat/admin/sessions", { credentials: "include" });
      if (res.ok) {
        const data: SupportSession[] = await res.json();
        setSessions(data);
        setTotalUnread(data.reduce((a, s) => a + s.unreadCount, 0));
        if (activeSession) {
          const updated = data.find((s) => s.sessionId === activeSession.sessionId);
          if (updated) setActiveSession(updated);
        }
      }
    } catch {}
    setLoadingSessions(false);
  }, [activeSession]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/support-chat/admin/sessions/${sessionId}/messages`, {
        credentials: "include",
      });
      if (res.ok) setMessages(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchSessions(); }, []);

  // Poll sessions every 5s
  useEffect(() => {
    const id = setInterval(fetchSessions, 5000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  // Poll messages every 3s when conversation active
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (activeSession) {
      fetchMessages(activeSession.sessionId);
      pollRef.current = setInterval(() => fetchMessages(activeSession.sessionId), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeSession, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectSession = async (session: SupportSession) => {
    setActiveSession(session);
    setMessages([]);
    await fetchMessages(session.sessionId);
  };

  const handleReply = async () => {
    if (!replyText.trim() || sending || !activeSession) return;
    const text = replyText.trim();
    setReplyText("");
    setSending(true);
    try {
      const res = await fetch("/api/support-chat/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: activeSession.sessionId, message: text }),
      });
      if (res.ok) {
        const msg: SupportMsg = await res.json();
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
    } catch {}
    setSending(false);
  };

  const handleStatusChange = async (status: "open" | "closed" | "resolved") => {
    if (!activeSession) return;
    try {
      const res = await fetch(
        `/api/support-chat/admin/sessions/${activeSession.sessionId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        },
      );
      if (res.ok) {
        const updated = await res.json();
        setActiveSession((s) => s ? { ...s, ...updated } : null);
        setSessions((prev) =>
          prev.map((s) => s.sessionId === updated.sessionId ? { ...s, ...updated } : s),
        );
      }
    } catch {}
  };

  const handleDelete = async () => {
    if (!activeSession || !confirm("Delete this conversation permanently? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/support-chat/admin/sessions/${activeSession.sessionId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== activeSession.sessionId));
        setActiveSession(null);
        setMessages([]);
      }
    } catch {}
    setDeleting(false);
  };

  const filteredSessions = sessions.filter((s) => {
    if (filterTab === "open") return s.status === "open";
    if (filterTab === "resolved") return s.status === "resolved";
    return true;
  });

  return (
    <>
      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onCreated={() => { fetchSessions(); }}
        />
      )}

      <div className="flex h-full">
        {/* ── Left panel — session list ── */}
        <div className="w-72 xl:w-80 flex-shrink-0 border-r border-border flex flex-col bg-background">
          <div className="px-3 py-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Support Chat
                {totalUnread > 0 && (
                  <span className="w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchSessions}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* New conversation button */}
            <button
              onClick={() => setShowNewConv(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New Conversation
            </button>

            {/* Filter tabs */}
            <div className="flex gap-1">
              {(["all", "open", "resolved"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={cn(
                    "flex-1 py-1 text-[11px] font-medium rounded-md transition-colors capitalize",
                    filterTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Click "New Conversation" to start chatting with a user
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={activeSession?.sessionId === session.sessionId}
                  onClick={() => selectSession(session)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel — active conversation ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Select a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Choose a support session from the left panel to view and reply to messages,
                or start a new conversation with any registered user.
              </p>
              <button
                onClick={() => setShowNewConv(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {activeSession.visitorName ?? "Anonymous Visitor"}
                    </p>
                    {activeSession.visitorEmail && (
                      <p className="text-xs text-muted-foreground truncate">{activeSession.visitorEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={activeSession.status}
                    onChange={(e) => handleStatusChange(e.target.value as "open" | "closed" | "resolved")}
                    className="text-xs px-2 py-1.5 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize font-medium", STATUS_STYLES[activeSession.status])}>
                    {activeSession.status}
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    title="Delete conversation"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2 items-start",
                        msg.fromAdmin ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        {msg.fromAdmin ? (
                          <span className="text-[10px] font-bold text-muted-foreground">A</span>
                        ) : (
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-xl px-3 py-2",
                          msg.fromAdmin
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border rounded-tl-sm",
                        )}
                      >
                        {!msg.fromAdmin && (
                          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                            {msg.visitorName ?? "Visitor"}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          msg.fromAdmin ? "justify-end" : "justify-start",
                        )}>
                          <Clock className="w-3 h-3 opacity-50" />
                          <span className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
                          {msg.fromAdmin && <CheckCheck className="w-3 h-3 opacity-50" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <div className="flex-shrink-0 p-3 border-t border-border bg-card">
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                    placeholder={
                      activeSession.status === "closed"
                        ? "Conversation is closed — change status to reply"
                        : "Type your reply…"
                    }
                    className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    disabled={activeSession.status === "closed"}
                  />
                  <button
                    onClick={handleReply}
                    disabled={sending || !replyText.trim() || activeSession.status === "closed"}
                    className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Reply
                      </>
                    )}
                  </button>
                </div>
                {activeSession.status === "closed" && (
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                    Session is closed.{" "}
                    <button
                      onClick={() => handleStatusChange("open")}
                      className="text-primary underline hover:no-underline"
                    >
                      Reopen it
                    </button>{" "}
                    to continue the conversation.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
