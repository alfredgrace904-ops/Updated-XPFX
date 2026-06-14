import { useState } from "react";
import {
  useGetAdminP2PMerchants,
  useDecideAdminP2PMerchantApplication,
  useRevokeAdminP2PMerchant,
  useNotifyAdminP2PMerchant,
  useGetAdminP2PMerchantChat,
  useSendAdminP2PMerchantChat,
  getGetAdminP2PMerchantChatQueryKey,
} from "@workspace/api-client-react";
import { Store, Loader2, X, Send, Bell, MessageCircle, Check, Ban } from "lucide-react";

type Tab = "pending" | "approved" | "rejected" | "merchants";

export function P2PMerchantsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const { data, isLoading, refetch } = useGetAdminP2PMerchants();
  const decideMutation = useDecideAdminP2PMerchantApplication();
  const revokeMutation = useRevokeAdminP2PMerchant();

  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [notifyUserId, setNotifyUserId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approve = async (applicationId: string) => {
    await decideMutation.mutateAsync({ applicationId, data: { decision: "approve" } });
    refetch();
  };

  const reject = async () => {
    if (!rejectId) return;
    await decideMutation.mutateAsync({
      applicationId: rejectId,
      data: { decision: "reject", reason: rejectReason || "Application rejected." },
    });
    setRejectId(null);
    setRejectReason("");
    refetch();
  };

  const revoke = async (userId: string, name: string) => {
    if (!confirm(`Revoke merchant access for ${name}? Their listings will be deactivated.`)) return;
    await revokeMutation.mutateAsync({ userId });
    refetch();
  };

  const apps = data?.applications ?? [];
  const merchants = data?.merchants ?? [];
  const pendingApps = apps.filter((a) => a.status === "pending");
  const approvedApps = apps.filter((a) => a.status === "approved");
  const rejectedApps = apps.filter((a) => a.status === "rejected");
  const visibleApps =
    tab === "pending" ? pendingApps :
    tab === "approved" ? approvedApps :
    tab === "rejected" ? rejectedApps :
    [];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Store className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">P2P Merchants</h1>
          <p className="text-sm text-muted-foreground">Approve applications, manage active merchants, send notifications and chat.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit flex-wrap">
        {(
          [
            { key: "pending" as const, label: `Pending (${pendingApps.length})` },
            { key: "approved" as const, label: `Approved (${approvedApps.length})` },
            { key: "rejected" as const, label: `Rejected (${rejectedApps.length})` },
            { key: "merchants" as const, label: `Active Merchants (${merchants.length})` },
          ]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : tab !== "merchants" ? (
        <div className="space-y-3">
          {visibleApps.length === 0 ? (
            <div className="bg-card border border-card-border rounded-xl p-8 text-center text-sm text-muted-foreground">
              No {tab} applications.
            </div>
          ) : (
            visibleApps.map((app) => (
              <div key={app.id} className="bg-card border border-card-border rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground">{app.displayName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        app.status === "approved" ? "bg-green-500/20 text-green-400" :
                        app.status === "rejected" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>{app.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {app.userName} · {app.userEmail} · Submitted {new Date(app.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approve(app.id)}
                        disabled={decideMutation.isPending}
                        className="flex items-center gap-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectId(app.id)}
                        className="flex items-center gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Info label="Legal name" value={app.legalName} />
                  <Info label="Country" value={app.country} />
                  <Info label="Contact email" value={app.contactEmail} />
                  <Info label="Payment method" value={app.paymentMethod === "etransfer" ? "E-Transfer" : "Bank transfer"} />
                  {app.paymentMethod === "etransfer" ? (
                    <Info label="E-Transfer email" value={app.payoutEmail} />
                  ) : (
                    <Info label="Bank info" value={app.bankInfo} />
                  )}
                  <Info label="Assets" value={app.assets} />
                  {app.rejectionReason && <Info label="Rejection reason" value={app.rejectionReason} />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reason</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-md p-3">{app.reason}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Merchant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Listings</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approved</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {merchants.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No active merchants.</td></tr>
              ) : (
                merchants.map((m) => (
                  <tr key={m.userId} className="hover:bg-accent/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{m.displayName}</td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{m.userName}</p>
                      <p className="text-xs text-muted-foreground">{m.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-foreground">{m.totalListings}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {m.approvedAt ? new Date(m.approvedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setNotifyUserId(m.userId)}
                          className="flex items-center gap-1 text-xs text-primary hover:opacity-80"
                        >
                          <Bell className="w-3.5 h-3.5" /> Notify
                        </button>
                        <button
                          onClick={() => setChatUserId(m.userId)}
                          className="flex items-center gap-1 text-xs text-primary hover:opacity-80"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </button>
                        <button
                          onClick={() => revoke(m.userId, m.displayName)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:opacity-80"
                        >
                          <Ban className="w-3.5 h-3.5" /> Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {rejectId && (
        <Modal title="Reject Application" onClose={() => setRejectId(null)}>
          <div className="space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Reason for rejection (visible to applicant)"
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm placeholder:text-muted-foreground resize-none"
            />
            <button
              onClick={reject}
              disabled={decideMutation.isPending}
              className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md px-4 py-2 text-sm font-medium"
            >
              {decideMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </Modal>
      )}

      {notifyUserId && (
        <NotifyModal userId={notifyUserId} onClose={() => setNotifyUserId(null)} />
      )}

      {chatUserId && (
        <ChatModal userId={chatUserId} onClose={() => setChatUserId(null)} />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground break-words">{value}</p>
    </div>
  );
}

type NotifyKind = "general" | "deposit_incoming" | "deposit_confirmed" | "p2p_deposit" | "order_update";

function NotifyModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const notifyMutation = useNotifyAdminP2PMerchant();
  const [kind, setKind] = useState<NotifyKind>("general");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [asset, setAsset] = useState("USDT");
  const [reference, setReference] = useState("");
  const [instructions, setInstructions] = useState("");

  const showDeposit = kind === "deposit_incoming" || kind === "deposit_confirmed" || kind === "p2p_deposit";

  const send = async () => {
    if (!title.trim() || !message.trim()) return;
    await notifyMutation.mutateAsync({
      userId,
      data: {
        kind,
        title: title.trim(),
        message: message.trim(),
        amount: showDeposit && amount ? parseFloat(amount) : null,
        currency: showDeposit ? currency.trim().toUpperCase() : null,
        asset: showDeposit ? asset.trim().toUpperCase() || null : null,
        reference: reference.trim() || null,
        instructions: instructions.trim() || null,
      },
    });
    onClose();
  };

  return (
    <Modal title="Send Notification" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NotifyKind)}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
          >
            <option value="general">General message</option>
            <option value="p2p_deposit">P2P deposit</option>
            <option value="deposit_incoming">Deposit incoming</option>
            <option value="deposit_confirmed">Deposit confirmed</option>
            <option value="order_update">Order update</option>
          </select>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Message body"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm resize-none"
        />
        {showDeposit && (
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="px-3 py-2 bg-input border border-border rounded-md text-sm"
            />
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="Currency"
              className="px-3 py-2 bg-input border border-border rounded-md text-sm uppercase"
            />
            <input
              value={asset}
              onChange={(e) => setAsset(e.target.value.toUpperCase())}
              placeholder="Asset (BTC)"
              className="px-3 py-2 bg-input border border-border rounded-md text-sm uppercase"
            />
          </div>
        )}
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference (txid / order id, optional)"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
        />
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder="Follow-up instructions (optional)"
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm resize-none"
        />
        <button
          onClick={send}
          disabled={notifyMutation.isPending || !title.trim() || !message.trim()}
          className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {notifyMutation.isPending ? "Sending..." : "Send Notification"}
        </button>
      </div>
    </Modal>
  );
}

function ChatModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: thread, refetch } = useGetAdminP2PMerchantChat(userId, {
    query: { refetchInterval: 10000, queryKey: getGetAdminP2PMerchantChatQueryKey(userId) },
  });
  const sendMutation = useSendAdminP2PMerchantChat();
  const [content, setContent] = useState("");

  const send = async () => {
    if (!content.trim()) return;
    await sendMutation.mutateAsync({ userId, data: { content: content.trim() } });
    setContent("");
    refetch();
  };

  return (
    <Modal title="Merchant Chat" onClose={onClose} wide>
      <div className="flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
          {(thread ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet.</p>
          ) : (
            (thread ?? []).map((m) => {
              const fromAdmin = !m.isFromUser;
              return (
                <div
                  key={m.id}
                  className={`max-w-[75%] ${fromAdmin ? "ml-auto" : "mr-auto"}`}
                >
                  <div className={`rounded-lg px-3 py-2 text-sm ${
                    fromAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>
                    {m.content}
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-0.5 ${fromAdmin ? "text-right" : ""}`}>
                    {m.senderName} · {new Date(m.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-input border border-border rounded-md text-sm"
          />
          <button
            onClick={send}
            disabled={sendMutation.isPending || !content.trim()}
            className="bg-primary text-primary-foreground rounded-md p-2 hover:opacity-90 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-card border border-card-border rounded-xl p-5 w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
