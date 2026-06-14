import { useState, useRef, useEffect } from "react";
import { useGetLiveChatMessages, useSendLiveChatMessage } from "@workspace/api-client-react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useGetLiveChatMessages({
    query: {
      queryKey: ["getLiveChatMessages"],
      enabled: open,
      refetchInterval: open ? 3000 : false,
    },
  });
  const sendMutation = useSendLiveChatMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || sendMutation.isPending) return;
    const text = message;
    setMessage("");
    await sendMutation.mutateAsync({ data: { content: text } });
    qc.invalidateQueries({ queryKey: ["getLiveChatMessages"] });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:opacity-90 transition-all duration-200 hover:scale-105"
        aria-label="Open live chat"
      >
        {open ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-96 bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-primary">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">XpressPro FX Support</p>
              <p className="text-xs text-white/70">AI-powered · usually instant</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!isLoading && messages.length === 0 && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-none px-3 py-2 text-sm text-foreground max-w-[85%]">
                  Hello! Welcome to XpressPro FX support. How can I help you today?
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 items-start ${m.isFromUser ? "flex-row-reverse" : ""}`}
              >
                {!m.isFromUser && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                    m.isFromUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || !message.trim()}
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
