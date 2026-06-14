import { useState } from "react";
import { useGetAdminLiveChats, useAdminReplyLiveChat } from "@workspace/api-client-react";
import { MessageCircle, Send, Loader2, AlertCircle } from "lucide-react";

export function LiveChatPage() {
  const { data: sessions, isLoading, refetch } = useGetAdminLiveChats();
  const replyMutation = useAdminReplyLiveChat();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const selectedSession = (sessions ?? []).find((s) => s.userId === selectedUserId);

  const handleSend = async () => {
    if (!selectedUserId || !reply.trim()) return;
    await replyMutation.mutateAsync({
      userId: selectedUserId,
      data: { content: reply },
    });
    setReply("");
    refetch();
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col gap-3 sm:gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Live Chat</h1>
        <p className="text-sm text-muted-foreground">Manage user support conversations</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 min-h-0">
        {/* Session list */}
        <div className={`w-full md:w-64 md:flex-shrink-0 bg-card border border-card-border rounded-xl overflow-hidden flex flex-col ${selectedUserId ? "hidden md:flex max-h-64 md:max-h-none" : "flex max-h-72 md:max-h-none"}`}>
          <div className="px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (sessions ?? []).length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No active chats.</div>
            ) : (
              (sessions ?? []).map((s) => (
                <button
                  key={s.userId}
                  onClick={() => setSelectedUserId(s.userId)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors ${
                    selectedUserId === s.userId ? "bg-accent/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{s.userName}</p>
                    {s.escalated && (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.userEmail}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.messages.length} message{s.messages.length !== 1 ? "s" : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-card border border-card-border rounded-xl flex flex-col overflow-hidden">
          {!selectedSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{selectedSession.userName}</p>
                <p className="text-xs text-muted-foreground">{selectedSession.userEmail}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedSession.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isFromUser ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-xs rounded-xl px-3 py-2 ${
                      m.isFromUser
                        ? "bg-muted text-foreground"
                        : m.isBot
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <p className="text-xs font-medium mb-0.5 opacity-70">{m.senderName}</p>
                      <p className="text-sm">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type your reply..."
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSend}
                  disabled={replyMutation.isPending || !reply.trim()}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
