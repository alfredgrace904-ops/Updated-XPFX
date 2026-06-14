/**
 * AI Analyst Page
 * Professional financial AI assistant with market analysis, risk checking,
 * and investment strategy generation.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Loader2, BarChart2, Shield, Lightbulb, TrendingUp,
  RefreshCw, ChevronDown, AlertTriangle, Sparkles, Brain, Target,
  BookOpen, X, Plus, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: AnalysisMode;
  timestamp: number;
}

type AnalysisMode = "general" | "technical" | "risk" | "strategy" | "sentiment";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = "xpfx_ai_analyst_history";
const MAX_HISTORY = 40;

const MODES: { value: AnalysisMode; label: string; icon: React.ElementType; color: string }[] = [
  { value: "general", label: "General", icon: Bot, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "technical", label: "Technical", icon: BarChart2, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "risk", label: "Risk Check", icon: Shield, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "strategy", label: "Strategy", icon: Lightbulb, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "sentiment", label: "Sentiment", icon: TrendingUp, color: "bg-green-500/20 text-green-400 border-green-500/30" },
];

const QUICK_PROMPTS: { label: string; prompt: string; mode: AnalysisMode }[] = [
  { label: "EUR/USD outlook", prompt: "What is the current outlook for EUR/USD? Key support/resistance levels and potential trade setups.", mode: "technical" },
  { label: "Bitcoin analysis", prompt: "Analyze Bitcoin's current trend and momentum. What are the key levels traders should watch?", mode: "technical" },
  { label: "Risk management basics", prompt: "Explain the core principles of forex risk management including position sizing and stop-loss placement.", mode: "risk" },
  { label: "Diversified portfolio", prompt: "Suggest a diversified trading portfolio across forex, crypto, and commodities for a moderate risk profile.", mode: "strategy" },
  { label: "Market sentiment check", prompt: "What is the current market sentiment across major asset classes? Any key events or catalysts to watch?", mode: "sentiment" },
  { label: "Gold analysis", prompt: "Technical analysis of Gold (XAU/USD): current trend, key levels, and what might drive the next major move.", mode: "technical" },
];

// ---------------------------------------------------------------------------
// Markdown renderer (lightweight)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={key++} className="text-sm font-bold text-foreground mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={key++} className="text-sm font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      nodes.push(<p key={key++} className="font-semibold text-foreground">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.slice(2);
      nodes.push(
        <li key={key++} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary mt-1 flex-shrink-0">•</span>
          <span>{formatInline(content)}</span>
        </li>
      );
    } else if (line.startsWith("⚠️")) {
      nodes.push(
        <div key={key++} className="flex gap-2 items-start mt-3 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{line.slice(2).trim()}</span>
        </div>
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={key++} className="h-2" />);
    } else {
      nodes.push(<p key={key++} className="text-sm text-muted-foreground leading-relaxed">{formatInline(line)}</p>);
    }
  }
  return <>{nodes}</>;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Market Overview Panel
// ---------------------------------------------------------------------------

function MarketOverviewPanel() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-analyst/market-summary", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.content);
        setLastUpdated(new Date());
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Market Overview</span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetch_}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      <div className="p-4 min-h-[120px]">
        {loading && !summary ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating market overview...
          </div>
        ) : summary ? (
          <div className="prose-sm">{renderMarkdown(summary)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load market overview.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Checker Panel
// ---------------------------------------------------------------------------

function RiskCheckerPanel() {
  const [asset, setAsset] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [leverage, setLeverage] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [result, setResult] = useState<{ content: string; riskLevel: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const RISK_COLORS: Record<string, string> = {
    low: "text-green-400 bg-green-500/10 border-green-500/30",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    extreme: "text-red-400 bg-red-500/10 border-red-500/30",
    unknown: "text-muted-foreground bg-muted/50 border-border",
  };

  const handleCheck = async () => {
    if (!asset.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai-analyst/risk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          asset,
          positionSize: positionSize ? Number(positionSize) : undefined,
          accountBalance: accountBalance ? Number(accountBalance) : undefined,
          leverage: leverage ? Number(leverage) : undefined,
          direction,
        }),
      });
      if (res.ok) setResult(await res.json());
    } catch {}
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Shield className="w-4 h-4 text-red-400" />
        <span className="text-sm font-semibold text-foreground">Risk Checker</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Asset / Pair *</label>
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            placeholder="e.g. EUR/USD, Bitcoin, Gold"
            className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Position Size ($)</label>
            <input
              type="number"
              value={positionSize}
              onChange={(e) => setPositionSize(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Account Balance ($)</label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Leverage</label>
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "long" | "short")}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="long">Long (Buy)</option>
              <option value="short">Short (Sell)</option>
            </select>
          </div>
        </div>
        <Button onClick={handleCheck} disabled={loading || !asset.trim()} className="w-full" size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
          Analyze Risk
        </Button>
        {result && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Risk Level:</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold capitalize", RISK_COLORS[result.riskLevel])}>
                {result.riskLevel === "unknown" ? "Analyzing..." : result.riskLevel}
              </span>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-48 overflow-y-auto">
              {renderMarkdown(result.content)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AI Chat
// ---------------------------------------------------------------------------

export function AiAnalyst() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw).slice(-MAX_HISTORY) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("general");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [showQuickPrompts, setShowQuickPrompts] = useState(messages.length === 0);
  const [activeTab, setActiveTab] = useState<"chat" | "overview" | "risk">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamBuffer]);

  const sendMessage = useCallback(async (text: string, selectedMode: AnalysisMode = mode) => {
    if (!text.trim() || loading) return;
    setShowQuickPrompts(false);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      mode: selectedMode,
      timestamp: Date.now(),
    };

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreaming(true);
    setStreamBuffer("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai-analyst/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text.trim(), history, mode: selectedMode }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.delta) {
              accumulated += payload.delta;
              setStreamBuffer(accumulated);
            }
            if (payload.done) {
              const finalContent = accumulated || payload.content || "";
              if (finalContent) {
                const aiMsg: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: finalContent,
                  mode: selectedMode,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, aiMsg]);
              }
              setStreamBuffer("");
              setStreaming(false);
              setLoading(false);
              return;
            }
          } catch {}
        }
      }

      if (accumulated) {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: accumulated,
          mode: selectedMode,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I encountered an error. Please try again.\n\n⚠️ This is educational content only and not personalized financial advice.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setStreamBuffer("");
      setStreaming(false);
      setLoading(false);
    }
  }, [loading, messages, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, mode);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    setShowQuickPrompts(true);
    try { localStorage.removeItem(LS_KEY); } catch {}
  };

  const currentMode = MODES.find((m) => m.value === mode)!;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                AI Analyst
                <Sparkles className="w-4 h-4 text-primary" />
              </h1>
              <p className="text-xs text-muted-foreground">Powered by Claude 3.5 Sonnet · Educational use only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span className="text-[10px] text-yellow-500 font-medium">Not financial advice</span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mt-3">
          {(["chat", "overview", "risk"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab === "chat" ? "Ask AI Analyst" : tab === "overview" ? "Market Overview" : "Risk Checker"}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "overview" && (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <MarketOverviewPanel />
          </div>
        )}

        {activeTab === "risk" && (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <RiskCheckerPanel />
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col h-full">
            {/* Mode Selector */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                      mode === m.value
                        ? m.color
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Welcome state */}
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">XpressPro FX AI Analyst</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Ask me about market analysis, trading strategies, risk management, or any financial topic.
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    <span className="text-[11px] text-yellow-500">Educational purposes only — not financial advice</span>
                  </div>
                </div>
              )}

              {/* Quick Prompts */}
              {showQuickPrompts && messages.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {QUICK_PROMPTS.map((qp) => {
                    const m = MODES.find((x) => x.value === qp.mode)!;
                    const Icon = m.icon;
                    return (
                      <button
                        key={qp.label}
                        onClick={() => sendMessage(qp.prompt, qp.mode)}
                        className="text-left p-3 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center", m.color.split(" ").slice(0, 2).join(" "))}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className="text-xs font-medium text-foreground">{qp.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{qp.prompt}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg) => {
                const msgMode = MODES.find((m) => m.value === msg.mode);
                const ModeIcon = msgMode?.icon ?? Bot;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-4 py-3",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border rounded-tl-sm",
                      )}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                      )}
                      <div className={cn(
                        "text-[10px] mt-1.5",
                        msg.role === "user" ? "text-primary-foreground/60 text-right" : "text-muted-foreground",
                      )}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {msgMode && msg.role === "assistant" && (
                          <span className="ml-1.5 capitalize">· {msgMode.label}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Streaming message */}
              {streaming && streamBuffer && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="max-w-[85%] rounded-xl rounded-tl-sm px-4 py-3 bg-card border border-border">
                    <div className="space-y-1">{renderMarkdown(streamBuffer)}</div>
                    <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5" />
                  </div>
                </div>
              )}

              {/* Loading dots */}
              {loading && !streamBuffer && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border border-border rounded-xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 border-t border-border bg-background">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs", currentMode.color)}>
                  <currentMode.icon className="w-3 h-3" />
                  {currentMode.label} mode
                </div>
                <button
                  onClick={() => setShowQuickPrompts((v) => !v)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Quick prompts
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${mode === "general" ? "any market topic..." : mode === "technical" ? "chart patterns, indicators..." : mode === "risk" ? "position sizing, stop-loss..." : mode === "strategy" ? "investment strategies..." : "market sentiment..."}`}
                  rows={1}
                  className="flex-1 min-h-[42px] max-h-[120px] resize-none text-sm"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !input.trim()} className="h-[42px] px-3" size="sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                For educational purposes only · Not personalized financial advice · Always do your own research
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
