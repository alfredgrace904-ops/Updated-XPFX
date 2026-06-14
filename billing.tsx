/**
 * Billing page
 * ------------
 * Shows the customer's three mandatory monthly fees for the current cycle:
 *
 *   1. Monthly maintenance fee
 *   2. AI assistance bot subscription
 *   3. Active ongoing trade fee
 *
 * Customers can settle individual fees or pay the entire cycle in one go.
 * Past cycles are listed below for reference.
 */
import { useMemo, useState } from "react";
import {
  useGetMyBilling,
  usePayBilling,
  getGetMyBillingQueryKey,
} from "@workspace/api-client-react";
import type { BillingCharge } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Bot,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";

const CHARGE_META: Record<
  BillingCharge["key"],
  { icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  maintenance: {
    icon: Wrench,
    description:
      "Compulsory monthly account upkeep. Covers platform infrastructure, security, and reporting.",
  },
  aiBot: {
    icon: Bot,
    description:
      "Mandatory subscription for the AI assistance bot that monitors your account 24/7.",
  },
  activeTrade: {
    icon: TrendingUp,
    description:
      "Per-cycle fee charged for every ongoing trade carried into this billing cycle.",
  },
};

export function Billing() {
  const { data, isLoading } = useGetMyBilling();
  const payMutation = usePayBilling();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<BillingCharge["key"] | "all" | null>(null);

  const unpaid = useMemo(
    () => data?.currentCycle.charges.filter((c) => !c.paid) ?? [],
    [data],
  );
  const totalDueNow = unpaid.reduce((s, c) => s + c.amount, 0);

  const settle = async (items: BillingCharge["key"][], label: BillingCharge["key"] | "all") => {
    setPending(label);
    try {
      await payMutation.mutateAsync({ data: { items, walletId: null } });
      await queryClient.invalidateQueries({ queryKey: getGetMyBillingQueryKey() });
      toast({ title: "Payment successful", description: "Your fees have been settled." });
    } catch (e: unknown) {
      toast({
        title: "Payment failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(null);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const cycle = data.currentCycle;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly billing</h1>
          <p className="text-sm text-muted-foreground">
            Mandatory monthly fees due at the end of each billing cycle.
          </p>
        </div>
        <Badge
          variant={data.overdue ? "destructive" : cycle.fullySettled ? "default" : "secondary"}
          className="self-start md:self-auto"
        >
          {data.overdue
            ? "Overdue"
            : cycle.fullySettled
              ? "Settled"
              : "Outstanding"}
        </Badge>
      </div>

      {data.overdue && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Cycle overdue</div>
              <div className="text-muted-foreground">
                Your previous billing cycle ended without all fees settled. Please clear
                outstanding charges to keep your trading account in good standing.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle>Cycle {cycle.cycleId}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(cycle.cycleStart), "MMM d, yyyy")} →{" "}
                {format(new Date(cycle.cycleEnd), "MMM d, yyyy")}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Due this cycle
              </div>
              <div className="text-2xl font-bold tabular-nums">
                ${totalDueNow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">
                of ${cycle.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {cycle.charges.map((c) => {
            const meta = CHARGE_META[c.key];
            const Icon = meta.icon;
            return (
              <div
                key={c.key}
                className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-lg border border-border bg-card/50"
                data-testid={`row-charge-${c.key}`}
              >
                <div
                  className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${
                    c.paid
                      ? "bg-success/15 text-success"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {c.paid ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium text-sm">{c.label}</div>
                    {c.paid && (
                      <Badge variant="default" className="bg-success/15 text-success border-success/20">
                        Paid
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                  {c.paid && c.paidAt && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Settled on {format(new Date(c.paidAt), "MMM d, yyyy HH:mm")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 md:ml-auto">
                  <div className="text-right">
                    <div className="text-base font-semibold tabular-nums">
                      ${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{cycle.currency}</div>
                  </div>
                  {!c.paid && (
                    <Button
                      size="sm"
                      onClick={() => settle([c.key], c.key)}
                      disabled={!!pending || payMutation.isPending}
                      data-testid={`button-pay-${c.key}`}
                    >
                      {pending === c.key && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Charges are auto-debited from your main wallet on settlement.
            </div>
            <Button
              size="lg"
              disabled={unpaid.length === 0 || !!pending || payMutation.isPending}
              onClick={() => settle(unpaid.map((c) => c.key), "all")}
              data-testid="button-pay-all"
            >
              {pending === "all" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CreditCard className="h-4 w-4 mr-2" />
              {unpaid.length === 0
                ? "All settled"
                : `Pay all — $${totalDueNow.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past cycles</CardTitle>
          <CardDescription>Completed billing periods.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No past cycles yet — your first cycle is currently open.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.history.map((h) => (
                    <TableRow key={h.cycleId}>
                      <TableCell className="font-medium">{h.cycleId}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(h.cycleStart), "MMM d")} →{" "}
                        {format(new Date(h.cycleEnd), "MMM d")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        ${h.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        ${h.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={h.fullySettled ? "default" : "destructive"}>
                          {h.fullySettled ? "Settled" : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
