import { useState } from "react";
import { Link } from "wouter";
import {
  useGetAdminAlerts,
  useMarkAllAdminAlertsRead,
  useGetAdminNotificationSettings,
  useUpdateAdminNotificationSettings,
  useGetAdminSentEmails,
  useCreateBroadcastSupportTicket,
  getGetAdminAlertsQueryKey,
  getGetAdminNotificationSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Mail, Megaphone, Settings, Loader2 } from "lucide-react";

const SETTING_LABELS: Record<string, string> = {
  withdrawalGasFeeRequired: "Withdrawal gas-fee required",
  withdrawalApproved: "Withdrawal approved",
  withdrawalRejected: "Withdrawal rejected",
  withdrawalExpired: "Withdrawal expired (auto)",
  kycApproved: "KYC approved",
  kycRejected: "KYC rejected",
  kycReset: "KYC reset",
  accountSuspended: "Account suspended/reinstated",
  accountDisabled: "Account disabled/enabled",
  accountFlagged: "Account flagged",
  broadcastTicket: "Broadcast support ticket",
  mailboxReply: "Mailbox reply",
  liveChatHandoff: "Live-chat handoff",
  withdrawalSubmitted: "Withdrawal submitted (user)",
  depositReceived: "Deposit received",
  p2pOrderUpdate: "P2P order update",
  tradeOpened: "Trade opened",
  walletTransfer: "Wallet transfer",
};

export function AdminNotificationsPage() {
  const qc = useQueryClient();
  const { data: alerts } = useGetAdminAlerts();
  const { data: settings } = useGetAdminNotificationSettings();
  const { data: emails } = useGetAdminSentEmails();
  const markAllRead = useMarkAllAdminAlertsRead();
  const updateSettings = useUpdateAdminNotificationSettings();
  const broadcast = useCreateBroadcastSupportTicket();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [mode, setMode] = useState<"ticket" | "mailbox">("ticket");
  const [filterKyc, setFilterKyc] = useState<"any" | "approved" | "pending" | "rejected" | "not_submitted">("any");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterMerchant, setFilterMerchant] = useState<"any" | "only" | "exclude">("any");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleToggle = async (key: string, value: boolean) => {
    if (!settings) return;
    await updateSettings.mutateAsync({
      data: { ...settings, [key]: value },
    });
    qc.invalidateQueries({ queryKey: getGetAdminNotificationSettingsQueryKey() });
  };

  const handleBroadcast = async () => {
    if (!subject.trim() || !message.trim()) {
      setBroadcastMsg("Subject and message are required.");
      return;
    }
    const filters: Record<string, string> = {};
    if (filterKyc !== "any") filters["kycStatus"] = filterKyc;
    if (filterCountry.trim()) filters["country"] = filterCountry.trim();
    if (filterMerchant !== "any") filters["merchant"] = filterMerchant;
    const res = await broadcast.mutateAsync({
      data: {
        subject: subject.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
        priority,
        mode,
        filters: Object.keys(filters).length ? filters : undefined,
      } as Parameters<typeof broadcast.mutateAsync>[0]["data"],
    });
    setBroadcastMsg(
      `Broadcast (${res.mode ?? mode}) delivered to ${res.recipients} users` +
      (res.skipped ? `, ${res.skipped} skipped by filters.` : "."),
    );
    setSubject("");
    setMessage("");
    setImageUrl("");
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Admin alerts, per-action email toggles, sent-email log, and broadcast tickets.
        </p>
      </div>

      {/* Alert stream */}
      <section className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Admin alerts
          </h2>
          <button
            onClick={async () => {
              await markAllRead.mutateAsync();
              qc.invalidateQueries({ queryKey: getGetAdminAlertsQueryKey() });
            }}
            className="text-xs text-primary hover:underline"
            data-testid="button-mark-alerts-read"
          >
            Mark all read
          </button>
        </div>
        {!alerts || alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts.</p>
        ) : (
          <ul className="divide-y divide-border max-h-80 overflow-y-auto">
            {alerts.map((a) => {
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{a.title}</span>
                    <span
                      className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                        a.severity === "critical"
                          ? "bg-destructive/10 text-destructive"
                          : a.severity === "warning"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                  {a.userEmail && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {a.userEmail}
                    </p>
                  )}
                </>
              );
              return (
                <li
                  key={a.id}
                  className={`py-2 ${a.read ? "opacity-60" : ""}`}
                  data-testid={`alert-${a.kind}`}
                >
                  {a.linkUrl ? (
                    <Link
                      href={a.linkUrl}
                      className="block hover:bg-accent/30 -mx-2 px-2 rounded transition-colors"
                    >
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Notification settings */}
      <section className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Settings className="h-4 w-4" /> Per-action email toggles
        </h2>
        {!settings ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(SETTING_LABELS).map(([k, label]) => (
              <label
                key={k}
                className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/30 rounded-md text-sm cursor-pointer"
              >
                <span className="text-foreground">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean((settings as unknown as Record<string, boolean>)[k])}
                  onChange={(e) => void handleToggle(k, e.target.checked)}
                  data-testid={`toggle-${k}`}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Broadcast */}
      <section className="bg-card border border-card-border rounded-xl p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Megaphone className="h-4 w-4" /> Broadcast to users
        </h2>
        <p className="text-xs text-muted-foreground">
          Choose who receives this and whether it lands in the support inbox or the
          one-way mailbox. Leave filters at "any" to broadcast to every non-admin user.
        </p>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          data-testid="input-broadcast-subject"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message body…"
          rows={4}
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          data-testid="input-broadcast-message"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Optional image URL (https://…)"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          data-testid="input-broadcast-image-url"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-medium text-muted-foreground space-y-1">
            <span>Delivery mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "ticket" | "mailbox")}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              data-testid="select-broadcast-mode"
            >
              <option value="ticket">Support ticket (replyable)</option>
              <option value="mailbox">Mailbox (no-reply, locked)</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground space-y-1">
            <span>Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              data-testid="select-broadcast-priority"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground space-y-1">
            <span>Filter — KYC status</span>
            <select
              value={filterKyc}
              onChange={(e) => setFilterKyc(e.target.value as typeof filterKyc)}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              data-testid="select-broadcast-kyc"
            >
              <option value="any">any</option>
              <option value="approved">approved</option>
              <option value="pending">pending</option>
              <option value="rejected">rejected</option>
              <option value="not_submitted">not submitted</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground space-y-1">
            <span>Filter — Merchant</span>
            <select
              value={filterMerchant}
              onChange={(e) => setFilterMerchant(e.target.value as typeof filterMerchant)}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              data-testid="select-broadcast-merchant"
            >
              <option value="any">any</option>
              <option value="only">P2P merchants only</option>
              <option value="exclude">exclude P2P merchants</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground space-y-1 sm:col-span-2">
            <span>Filter — Country (case-insensitive, exact match; leave blank for any)</span>
            <input
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              placeholder="e.g. US, NG, GB"
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
              data-testid="input-broadcast-country"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBroadcast}
            disabled={broadcast.isPending}
            className="ml-auto bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            data-testid="button-broadcast-send"
          >
            {broadcast.isPending ? "Sending…" : "Send broadcast"}
          </button>
        </div>
        {broadcastMsg && (
          <p className="text-sm text-primary" data-testid="text-broadcast-result">
            {broadcastMsg}
          </p>
        )}
      </section>

      {/* Sent emails */}
      <section className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Mail className="h-4 w-4" /> Sent emails
        </h2>
        <p className="text-xs text-muted-foreground mb-2">
          Audit log of every transactional email triggered by user / admin actions.
          When SENDGRID_API_KEY (or generic SMTP) is configured the emails are also
          delivered to recipients; otherwise they are recorded here only.
        </p>
        {!emails || emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {emails.slice(0, 50).map((e) => (
              <div key={e.id} className="py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{e.subject}</span>
                  <span className="text-muted-foreground">{e.kind}</span>
                </div>
                <p className="text-muted-foreground">to {e.to} · from {e.from}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminNotificationsPage;
