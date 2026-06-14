/**
 * Copy Trading Marketplace
 * -------------------------
 * Users can browse verified traders, inspect performance stats, set a copy
 * amount, and subscribe with one click.  Active subscriptions are shown at
 * the top with simulated P&L.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  ShieldCheck,
  Zap,
  BarChart2,
  Search,
  UserPlus,
  UserMinus,
  Info,
  Loader2,
  ChevronRight,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface RecentMonth {
  month: string;
  return: number;
}

interface Trader {
  id: string;
  name: string;
  title: string;
  avatarUrl: string | null;
  specialties: string[];
  winRate: number;
  monthlyReturnAvg: number;
  maxDrawdown: number;
  followerCount: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  tradingStyle: "aggressive" | "moderate" | "conservative";
  minCopyAmount: number;
  recentMonths: RecentMonth[];
  isFollowing: boolean;
  mySubscription: {
    copyAmount: number;
    currency: string;
    subscribedAt: string;
    simulatedPnlPct: number;
  } | null;
}

interface Subscription {
  id: string;
  managerId: string;
  copyAmount: number;
  currency: string;
  subscribedAt: string;
  simulatedPnlPct: number;
  managerName: string;
  managerTitle: string;
  managerAvatarUrl: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Data fetching                                                              */
/* -------------------------------------------------------------------------- */

const TRADERS_KEY = ["copy-trading", "traders"] as const;
const SUBS_KEY = ["copy-trading", "my-subscriptions"] as const;

async function fetchTraders(): Promise<{ traders: Trader[] }> {
  const res = await fetch("/api/copy-trading/traders", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load traders");
  return res.json();
}

async function fetchSubs(): Promise<{ subscriptions: Subscription[] }> {
  const res = await fetch("/api/copy-trading/my-subscriptions", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load subscriptions");
  return res.json();
}

async function subscribe(managerId: string, copyAmount: number) {
  const res = await fetch("/api/copy-trading/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ managerId, copyAmount }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to subscribe");
  }
  return res.json();
}

async function unsubscribe(managerId: string) {
  const res = await fetch(`/api/copy-trading/subscribe/${managerId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to unsubscribe");
  }
  return res.json();
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const STYLE_COLORS: Record<Trader["tradingStyle"], string> = {
  conservative: "bg-blue-500/10 text-blue-600 border-blue-200",
  moderate: "bg-amber-500/10 text-amber-600 border-amber-200",
  aggressive: "bg-red-500/10 text-red-600 border-red-200",
};

const STYLE_ICONS: Record<Trader["tradingStyle"], React.ComponentType<{ className?: string }>> = {
  conservative: ShieldCheck,
  moderate: Target,
  aggressive: Zap,
};

function MiniChart({ months }: { months: RecentMonth[] }) {
  if (!months.length) return null;
  const max = Math.max(...months.map((m) => Math.abs(m.return)), 1);
  return (
    <div className="flex items-end gap-0.5 h-10 mt-3">
      {months.map((m) => {
        const height = Math.max(4, (Math.abs(m.return) / max) * 40);
        const positive = m.return >= 0;
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.month}: ${m.return > 0 ? "+" : ""}${m.return}%`}>
            {positive ? (
              <>
                <div
                  className="w-full rounded-t-sm bg-emerald-500"
                  style={{ height: `${height}px` }}
                />
                <div className="w-full h-0 border-t border-muted-foreground/20" />
              </>
            ) : (
              <>
                <div className="w-full h-0 border-t border-muted-foreground/20" />
                <div
                  className="w-full rounded-b-sm bg-red-500"
                  style={{ height: `${height}px` }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subscribe Dialog                                                           */
/* -------------------------------------------------------------------------- */

function SubscribeDialog({
  trader,
  open,
  onClose,
}: {
  trader: Trader | null;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => subscribe(trader!.id, Number(amount)),
    onSuccess: () => {
      toast({ title: "Subscribed", description: `Now copying ${trader!.name}'s trades.` });
      qc.invalidateQueries({ queryKey: TRADERS_KEY });
      qc.invalidateQueries({ queryKey: SUBS_KEY });
      onClose();
      setAmount("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  if (!trader) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy {trader.name}</DialogTitle>
          <DialogDescription>
            Set your copy amount. Trades will be mirrored proportionally to this value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar>
              <AvatarImage src={trader.avatarUrl ?? undefined} />
              <AvatarFallback>{trader.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{trader.name}</p>
              <p className="text-sm text-muted-foreground">{trader.title}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-medium text-emerald-600">+{trader.monthlyReturnAvg.toFixed(1)}% /mo avg</p>
              <p className="text-xs text-muted-foreground">{(trader.winRate * 100).toFixed(0)}% win rate</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="copy-amount">Copy amount (USD)</Label>
            <Input
              id="copy-amount"
              type="number"
              min={trader.minCopyAmount}
              placeholder={`Min $${trader.minCopyAmount}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum copy amount: <strong>${trader.minCopyAmount}</strong>
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Copy trading involves risk. Past performance is not indicative of future results. You
              may lose all or part of your invested capital.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !amount || Number(amount) < trader.minCopyAmount}
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Start copying
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trader Card                                                                */
/* -------------------------------------------------------------------------- */

function TraderCard({
  trader,
  onFollow,
  onUnfollow,
}: {
  trader: Trader;
  onFollow: (t: Trader) => void;
  onUnfollow: (t: Trader) => void;
}) {
  const StyleIcon = STYLE_ICONS[trader.tradingStyle];
  const qc = useQueryClient();
  const { toast } = useToast();

  const unfollowMut = useMutation({
    mutationFn: () => unsubscribe(trader.id),
    onSuccess: () => {
      toast({ title: "Unsubscribed", description: `Stopped copying ${trader.name}.` });
      qc.invalidateQueries({ queryKey: TRADERS_KEY });
      qc.invalidateQueries({ queryKey: SUBS_KEY });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className={`flex flex-col transition-shadow hover:shadow-md ${trader.isFollowing ? "border-primary/40 shadow-sm" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={trader.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {trader.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base leading-tight">{trader.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{trader.title}</CardDescription>
            </div>
          </div>
          {trader.isFollowing && (
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">Following</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className={`text-xs ${STYLE_COLORS[trader.tradingStyle]}`}>
            <StyleIcon className="h-3 w-3 mr-1" />
            {trader.tradingStyle.charAt(0).toUpperCase() + trader.tradingStyle.slice(1)}
          </Badge>
          {trader.specialties.slice(0, 2).map((s) => (
            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Win Rate</p>
            <p className="font-bold text-emerald-600">{(trader.winRate * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Avg/Month</p>
            <p className="font-bold text-emerald-600">+{trader.monthlyReturnAvg.toFixed(1)}%</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Max Drawdown</p>
            <p className="font-bold text-red-500">{trader.maxDrawdown.toFixed(1)}%</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Followers</p>
            <p className="font-bold">{trader.followerCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Profit Factor: <span className="font-semibold text-foreground">{trader.profitFactor.toFixed(1)}</span></span>
          <span>Sharpe: <span className="font-semibold text-foreground">{trader.sharpeRatio.toFixed(1)}</span></span>
          <span>{trader.totalTrades.toLocaleString()} trades</span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">6-month performance</p>
          <MiniChart months={trader.recentMonths} />
        </div>

        {trader.isFollowing && trader.mySubscription && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 text-xs">
            <p className="font-semibold text-primary mb-1">Your subscription</p>
            <div className="flex justify-between">
              <span>Copy amount: <strong>${trader.mySubscription.copyAmount.toLocaleString()}</strong></span>
              <span className={trader.mySubscription.simulatedPnlPct >= 0 ? "text-emerald-600" : "text-red-500"}>
                {trader.mySubscription.simulatedPnlPct >= 0 ? "+" : ""}{trader.mySubscription.simulatedPnlPct.toFixed(2)}% P&L
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 flex gap-2">
        <p className="text-xs text-muted-foreground flex-1">Min: ${trader.minCopyAmount}</p>
        {trader.isFollowing ? (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onUnfollow(trader)}
            disabled={unfollowMut.isPending}
          >
            {unfollowMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserMinus className="h-3 w-3 mr-1" />}
            Unfollow
          </Button>
        ) : (
          <Button size="sm" onClick={() => onFollow(trader)}>
            <UserPlus className="h-3 w-3 mr-1" />
            Copy
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

type SortKey = "monthlyReturnAvg" | "winRate" | "followerCount" | "maxDrawdown";
type StyleFilter = "all" | Trader["tradingStyle"];

export function CopyTrading() {
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("followerCount");
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tradersData, isLoading } = useQuery({
    queryKey: TRADERS_KEY,
    queryFn: fetchTraders,
  });
  const { data: subsData } = useQuery({
    queryKey: SUBS_KEY,
    queryFn: fetchSubs,
  });

  const traders = tradersData?.traders ?? [];
  const subs = subsData?.subscriptions ?? [];

  const filtered = useMemo(() => {
    let list = [...traders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.specialties.some((s) => s.toLowerCase().includes(q)),
      );
    }
    if (styleFilter !== "all") {
      list = list.filter((t) => t.tradingStyle === styleFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "maxDrawdown") return a[sortKey] - b[sortKey];
      return b[sortKey] - a[sortKey];
    });
    return list;
  }, [traders, search, styleFilter, sortKey]);

  const handleFollow = (trader: Trader) => {
    setSelectedTrader(trader);
    setDialogOpen(true);
  };

  const handleUnfollow = (trader: Trader) => {
    setSelectedTrader(trader);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-7 w-7 text-primary" />
          Copy Trading
        </h1>
        <p className="text-muted-foreground mt-1">
          Follow verified traders and automatically mirror their positions. Past performance does not
          guarantee future results.
        </p>
      </div>

      <Tabs defaultValue="marketplace">
        <TabsList>
          <TabsTrigger value="marketplace">
            <BarChart2 className="h-4 w-4 mr-1.5" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="my-subscriptions">
            <Users className="h-4 w-4 mr-1.5" />
            My Subscriptions
            {subs.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 bg-primary text-primary-foreground">{subs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---- Marketplace Tab ---- */}
        <TabsContent value="marketplace" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search traders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={styleFilter} onValueChange={(v) => setStyleFilter(v as StyleFilter)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All styles</SelectItem>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="followerCount">Most followed</SelectItem>
                <SelectItem value="monthlyReturnAvg">Highest return</SelectItem>
                <SelectItem value="winRate">Win rate</SelectItem>
                <SelectItem value="maxDrawdown">Lowest drawdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[360px] w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No traders match your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((t) => (
                <TraderCard
                  key={t.id}
                  trader={t}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                />
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            Performance figures shown are historical and do not guarantee future results. Copy trading
            involves significant risk including the possible loss of all capital.
          </p>
        </TabsContent>

        {/* ---- My Subscriptions Tab ---- */}
        <TabsContent value="my-subscriptions" className="mt-4">
          {subs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">No active subscriptions</p>
              <p className="text-sm">Go to the Marketplace tab to start copying a trader.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subs.map((sub) => (
                <Card key={sub.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={sub.managerAvatarUrl ?? undefined} />
                        <AvatarFallback>{sub.managerName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{sub.managerName}</CardTitle>
                        <CardDescription className="text-xs">{sub.managerTitle}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Copy amount</span>
                      <span className="font-semibold">
                        ${sub.copyAmount.toLocaleString()} {sub.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscribed</span>
                      <span>{new Date(sub.subscribedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Simulated P&L</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${sub.simulatedPnlPct >= 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {sub.simulatedPnlPct >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {sub.simulatedPnlPct >= 0 ? "+" : ""}{sub.simulatedPnlPct.toFixed(2)}%
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 w-full"
                      onClick={() => {
                        unsubscribe(sub.managerId)
                          .then(() => {})
                          .catch(() => {});
                      }}
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                      Stop copying
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SubscribeDialog
        trader={selectedTrader}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedTrader(null); }}
      />
    </div>
  );
}
