import { useEffect, useState } from "react";
import {
  useGetConnectedWalletBalance,
  useSendFromConnectedWallet,
  getGetConnectedWalletBalanceQueryKey,
  getGetTransactionsQueryKey,
  type ConnectedWallet,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw,
  Send,
  QrCode,
  Copy,
  CheckCircle2,
  Loader2,
  Fuel,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

export function ConnectedWalletCard({ wallet }: { wallet: ConnectedWallet }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const balance = useGetConnectedWalletBalance(wallet.id, {
    query: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      queryKey: getGetConnectedWalletBalanceQueryKey(wallet.id),
    },
  });
  const live = balance.data;
  const positiveTokens = live?.tokens.filter((t) => t.balance > 0) ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: getGetConnectedWalletBalanceQueryKey(wallet.id),
    });
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      toast({ title: "Address copied", description: wallet.address });
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="border rounded-lg p-4 space-y-3"
      data-testid={`connected-wallet-card-${wallet.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {wallet.walletType.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              connected {format(new Date(wallet.connectedAt), "MMM d, yyyy")}
            </span>
          </div>
          <div
            className="text-sm font-mono break-all mt-1"
            title={wallet.address}
          >
            {wallet.address}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={copyAddress}
            data-testid={`button-copy-address-${wallet.id}`}
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={balance.isFetching}
            data-testid={`button-refresh-balance-${wallet.id}`}
          >
            {balance.isFetching ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5 mr-1" />
            )}
            Refresh
          </Button>
          <ReceiveDialog wallet={wallet} />
          <SendDialog wallet={wallet} liveBalance={live ?? null} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Stat
          label="ETH"
          value={live ? `${live.ethBalance.toFixed(6)}` : "—"}
          loading={balance.isFetching && !live}
        />
        <Stat
          label="Gas (gwei)"
          value={live ? live.gasPriceGwei.toFixed(2) : "—"}
          loading={balance.isFetching && !live}
        />
        <Stat
          label="Send fee est."
          value={live ? `${live.estimatedSendGasFeeEth.toFixed(6)} ETH` : "—"}
          loading={balance.isFetching && !live}
          icon={<Fuel className="h-3 w-3" />}
        />
        <Stat
          label="RPC source"
          value={live ? live.source : "—"}
          loading={balance.isFetching && !live}
        />
      </div>
      {live?.fetchedAt && (
        <div
          className="text-[11px] text-muted-foreground"
          data-testid={`balance-fetched-at-${wallet.id}`}
        >
          Last updated {format(new Date(live.fetchedAt), "MMM d, yyyy 'at' HH:mm:ss")}
        </div>
      )}

      {positiveTokens.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {positiveTokens.map((t) => (
            <Badge key={t.symbol} variant="secondary">
              {t.balance.toFixed(t.decimals <= 6 ? 2 : 4)} {t.symbol}
            </Badge>
          ))}
        </div>
      )}

      {live?.error && (
        <div className="text-xs text-destructive" data-testid={`balance-error-${wallet.id}`}>
          Live balance lookup failed: {live.error}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: string;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-mono text-sm">
        {loading ? <Skeleton className="h-4 w-16 mt-1" /> : value}
      </div>
    </div>
  );
}

function ReceiveDialog({ wallet }: { wallet: ConnectedWallet }) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(wallet.address, { width: 240, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, wallet.address]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-receive-${wallet.id}`}>
          <QrCode className="h-3.5 w-3.5 mr-1" /> Receive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive to {wallet.walletType}</DialogTitle>
          <DialogDescription>
            Share this address or scan the QR with the sender's wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center space-y-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for ${wallet.address}`}
              className="rounded-md border bg-white p-2"
              width={240}
              height={240}
              data-testid={`qr-image-${wallet.id}`}
            />
          ) : (
            <Skeleton className="h-[240px] w-[240px]" />
          )}
          <div className="w-full space-y-2">
            <Label className="text-xs">Wallet address</Label>
            <div className="flex gap-2">
              <Input value={wallet.address} readOnly className="font-mono text-xs" />
              <Button onClick={copy} variant="outline">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only send assets supported by this network. Sending unsupported
              tokens may result in loss of funds.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SendDialogProps {
  wallet: ConnectedWallet;
  liveBalance: {
    ethBalance: number;
    tokens: { symbol: string; balance: number }[];
    estimatedSendGasFeeEth: number;
  } | null;
}

function SendDialog({ wallet, liveBalance }: SendDialogProps) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("ETH");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const send = useSendFromConnectedWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tokens = liveBalance?.tokens ?? [];
  const assetOptions = ["ETH", ...tokens.map((t) => t.symbol)];

  useEffect(() => {
    if (!confirmOpen) return;
    if (countdown <= 0) {
      void handleSend();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmOpen, countdown]);

  const requestSend = () => {
    if (!to.trim() || !amount || Number(amount) <= 0) {
      toast({
        title: "Enter destination + amount",
        description: "Both fields are required.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Review your transfer",
      description: "Broadcast will start in 10 seconds.",
    });
    setCountdown(10);
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    if (!to.trim() || !amount || Number(amount) <= 0) return;
    try {
      const res = await send.mutateAsync({
        walletId: wallet.id,
        data: { to: to.trim(), amount: Number(amount), asset },
      });
      if (res.success) {
        toast({
          title: "Transaction broadcast",
          description: res.hash
            ? `Tx ${res.hash.slice(0, 14)}…`
            : res.message,
        });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getGetConnectedWalletBalanceQueryKey(wallet.id),
          }),
          queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() }),
        ]);
        setOpen(false);
        setTo("");
        setAmount("");
      } else {
        toast({
          title: "Send failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Unknown error.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid={`button-send-${wallet.id}`}>
          <Send className="h-3.5 w-3.5 mr-1" /> Send
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send from {wallet.walletType}</DialogTitle>
          <DialogDescription>
            Sign and broadcast an on-chain transfer. Gas is paid in ETH from
            this wallet's balance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Asset</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger data-testid={`select-send-asset-${wallet.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`to-${wallet.id}`}>Destination address</Label>
            <Input
              id={`to-${wallet.id}`}
              placeholder="0x…"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="font-mono text-xs"
              data-testid={`input-send-to-${wallet.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`amount-${wallet.id}`}>Amount</Label>
            <Input
              id={`amount-${wallet.id}`}
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid={`input-send-amount-${wallet.id}`}
            />
            {liveBalance && (
              <p className="text-xs text-muted-foreground">
                Available:{" "}
                {asset === "ETH"
                  ? `${liveBalance.ethBalance.toFixed(6)} ETH`
                  : `${(tokens.find((t) => t.symbol === asset)?.balance ?? 0).toFixed(2)} ${asset}`}{" "}
                · Est. gas {liveBalance.estimatedSendGasFeeEth.toFixed(6)} ETH
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={requestSend}
            disabled={
              !to.trim() || !amount || Number(amount) <= 0 || send.isPending
            }
            data-testid={`button-confirm-send-${wallet.id}`}
          >
            {send.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          data-testid={`modal-send-confirm-${wallet.id}`}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Confirm transfer</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Broadcasting in <span className="font-mono text-amber-500" data-testid={`text-send-countdown-${wallet.id}`}>{countdown}</span> second{countdown === 1 ? "" : "s"}. Cancel now if anything looks wrong.
              </p>
            </div>
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} {asset}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">To</span>
                <span className="font-mono text-xs text-right break-all">{to}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                data-testid={`button-send-confirm-cancel-${wallet.id}`}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSend()} data-testid={`button-send-confirm-now-${wallet.id}`}>
                Send now
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
