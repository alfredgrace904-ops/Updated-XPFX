import { useState } from "react";
import { useGetAdminMailbox, useAdminMailboxReply } from "@workspace/api-client-react";
import { Mail, Send, Loader2, Inbox } from "lucide-react";
import { format } from "date-fns";

const PLATFORM_ADDRESSES = [
  "no_reply@xpressprofx.com",
  "help@xpressprofx.com",
  "management@xpressprofx.com",
  "admin@xpressprofx.com",
  "chrislukeman@xpressprofx.com",
];

export function MailboxPage() {
  const { data: threads, isLoading, refetch } = useGetAdminMailbox();
  const replyMutation = useAdminMailboxReply();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyFrom, setReplyFrom] = useState(PLATFORM_ADDRESSES[1]!);
  const [replyContent, setReplyContent] = useState("");

  const selected = (threads ?? []).find((t) => t.id === selectedId);

  const handleReply = async () => {
    if (!selectedId || !replyContent.trim()) return;
    await replyMutation.mutateAsync({
      threadId: selectedId,
      data: { from: replyFrom, content: replyContent },
    });
    setReplyContent("");
    refetch();
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-3 sm:gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mailbox</h1>
        <p className="text-sm text-muted-foreground">Platform email threads</p>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Platform mailboxes:</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_ADDRESSES.map((addr) => (
            <span key={addr} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Mail className="w-3 h-3 mr-1.5" />
              {addr}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 min-h-0">
        {/* Thread list */}
        <div className={`w-full md:w-72 md:flex-shrink-0 bg-card border border-card-border rounded-xl overflow-hidden flex flex-col ${selectedId ? "hidden md:flex" : "flex max-h-72 md:max-h-none"}`}>
          <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Threads ({(threads ?? []).length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (threads ?? []).length === 0 ? (
              <div className="p-6 text-center">
                <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No email threads yet.</p>
              </div>
            ) : (
              (threads ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors ${
                    selectedId === t.id ? "bg-accent/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                    {!t.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">From: {t.from}</p>
                  <p className="text-xs text-muted-foreground truncate">To: {t.to}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.messages.length} message{t.messages.length !== 1 ? "s" : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread view */}
        <div className="flex-1 bg-card border border-card-border rounded-xl flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a thread to view</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{selected.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From: {selected.from} → To: {selected.to}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selected.messages.map((m) => (
                  <div key={m.id} className="bg-muted/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">{m.from}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(m.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border space-y-2">
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">Reply from:</label>
                  <select
                    value={replyFrom}
                    onChange={(e) => setReplyFrom(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-input border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PLATFORM_ADDRESSES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <button
                    onClick={handleReply}
                    disabled={replyMutation.isPending || !replyContent.trim()}
                    className="self-end flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
