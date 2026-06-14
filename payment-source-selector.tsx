/**
 * Multi-source payment selector. Surfaces three categories of funding:
 *   1. Platform wallets (main, profit, ...) returned by /wallets.
 *   2. Connected external wallets (MetaMask, Trust, ...) returned by
 *      /wallets/connected. These can optionally fetch a live on-chain
 *      balance via /wallets/connected/{id}/balance.
 *   3. Verified bank accounts returned by /banks.
 *
 * The component is purely controlled — parents pass a `value` and
 * `onChange` and decide which categories to show via `allow`. Returns
 * a normalized PaymentSource that the caller can map to their flow's
 * specific payment-method enum (deposit method / purchase method / etc).
 */
import { useEffect, useMemo } from "react";
import {
  useGetBankAccounts,
  useGetConnectedWallets,
  useGetConnectedWalletBalance,
  useGetWallets,
  getGetBankAccountsQueryKey,
  getGetConnectedWalletsQueryKey,
  getGetConnectedWalletBalanceQueryKey,
  getGetWalletsQueryKey,
} from "@workspace/api-client-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Link as LinkIcon, Building2, Loader2 } from "lucide-react";

export type PaymentSourceKind = "platform_wallet" | "external_wallet" | "bank";

export interface PaymentSource {
  kind: PaymentSourceKind;
  /** Stable id for the source (walletId / connectedWalletId / bankId). */
  id: string;
  /** Human-readable label for receipts/transcripts. */
  label: string;
  /** Currency / asset symbol of the source. */
  currency: string;
  /** Optional balance — null means unknown. */
  balance: number | null;
}

interface PaymentSourceSelectorProps {
  value: PaymentSource | null;
  onChange: (source: PaymentSource) => void;
  allow?: PaymentSourceKind[];
  label?: string;
  /** Filter platform wallets by type (e.g. "main" only). */
  platformWalletTypes?: string[];
  /** Show live on-chain balance for the currently-selected external wallet. */
  showLiveBalance?: boolean;
  disabled?: boolean;
  testId?: string;
}

const ALL_KINDS: PaymentSourceKind[] = [
  "platform_wallet",
  "external_wallet",
  "bank",
];

function encode(kind: PaymentSourceKind, id: string): string {
  return `${kind}::${id}`;
}

function decode(value: string): { kind: PaymentSourceKind; id: string } | null {
  const [kind, id] = value.split("::");
  if (!kind || !id) return null;
  return { kind: kind as PaymentSourceKind, id };
}

export function PaymentSourceSelector({
  value,
  onChange,
  allow = ALL_KINDS,
  label = "Payment source",
  platformWalletTypes,
  showLiveBalance = false,
  disabled,
  testId,
}: PaymentSourceSelectorProps) {
  const showPlatform = allow.includes("platform_wallet");
  const showExternal = allow.includes("external_wallet");
  const showBank = allow.includes("bank");

  const { data: wallets } = useGetWallets({
    query: { enabled: showPlatform, queryKey: getGetWalletsQueryKey() },
  });
  const { data: connected } = useGetConnectedWallets({
    query: {
      enabled: showExternal,
      queryKey: getGetConnectedWalletsQueryKey(),
    },
  });
  const { data: banks } = useGetBankAccounts({
    query: { enabled: showBank, queryKey: getGetBankAccountsQueryKey() },
  });

  const platformWallets = useMemo(() => {
    if (!showPlatform) return [];
    return (wallets ?? []).filter((w) =>
      platformWalletTypes ? platformWalletTypes.includes(w.type) : true,
    );
  }, [showPlatform, wallets, platformWalletTypes]);

  const externalWallets = useMemo(() => {
    if (!showExternal) return [];
    return connected ?? [];
  }, [showExternal, connected]);

  const verifiedBanks = useMemo(() => {
    if (!showBank) return [];
    return (banks ?? []).filter((b) => b.verified);
  }, [showBank, banks]);

  // Auto-select the first available source when none chosen yet.
  useEffect(() => {
    if (value) return;
    if (platformWallets.length > 0) {
      const w = platformWallets[0]!;
      onChange({
        kind: "platform_wallet",
        id: w.id,
        label: `${w.label} (${w.currency})`,
        currency: w.currency,
        balance: w.balance,
      });
      return;
    }
    if (externalWallets.length > 0) {
      const w = externalWallets[0]!;
      onChange({
        kind: "external_wallet",
        id: w.id,
        label: `${w.walletType} ${w.address.slice(0, 6)}…${w.address.slice(-4)}`,
        currency: w.currency,
        balance: w.balance,
      });
      return;
    }
    if (verifiedBanks.length > 0) {
      const b = verifiedBanks[0]!;
      onChange({
        kind: "bank",
        id: b.id,
        label: `${b.bankName} ••${b.last4}`,
        currency: b.currency,
        balance: null,
      });
    }
  }, [value, platformWallets, externalWallets, verifiedBanks, onChange]);

  const selectedExternal =
    value?.kind === "external_wallet" ? value.id : null;
  const liveBalanceQuery = useGetConnectedWalletBalance(
    selectedExternal ?? "",
    {
      query: {
        enabled: showLiveBalance && Boolean(selectedExternal),
        refetchOnWindowFocus: false,
        queryKey: getGetConnectedWalletBalanceQueryKey(selectedExternal ?? ""),
      },
    },
  );

  const handleSelect = (raw: string) => {
    const decoded = decode(raw);
    if (!decoded) return;
    if (decoded.kind === "platform_wallet") {
      const w = platformWallets.find((x) => x.id === decoded.id);
      if (!w) return;
      onChange({
        kind: "platform_wallet",
        id: w.id,
        label: `${w.label} (${w.currency})`,
        currency: w.currency,
        balance: w.balance,
      });
    } else if (decoded.kind === "external_wallet") {
      const w = externalWallets.find((x) => x.id === decoded.id);
      if (!w) return;
      onChange({
        kind: "external_wallet",
        id: w.id,
        label: `${w.walletType} ${w.address.slice(0, 6)}…${w.address.slice(-4)}`,
        currency: w.currency,
        balance: w.balance,
      });
    } else if (decoded.kind === "bank") {
      const b = verifiedBanks.find((x) => x.id === decoded.id);
      if (!b) return;
      onChange({
        kind: "bank",
        id: b.id,
        label: `${b.bankName} ••${b.last4}`,
        currency: b.currency,
        balance: null,
      });
    }
  };

  const totalAvailable =
    platformWallets.length + externalWallets.length + verifiedBanks.length;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value ? encode(value.kind, value.id) : ""}
        onValueChange={handleSelect}
        disabled={disabled || totalAvailable === 0}
      >
        <SelectTrigger data-testid={testId ?? "select-payment-source"}>
          <SelectValue placeholder="Pick a funding source" />
        </SelectTrigger>
        <SelectContent>
          {showPlatform && platformWallets.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5" /> Platform wallets
              </SelectLabel>
              {platformWallets.map((w) => (
                <SelectItem
                  key={w.id}
                  value={encode("platform_wallet", w.id)}
                  data-testid={`payment-source-platform-${w.id}`}
                >
                  {w.label} — {w.balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })} {w.currency}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {showExternal && externalWallets.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <LinkIcon className="h-3.5 w-3.5" /> External wallets
              </SelectLabel>
              {externalWallets.map((w) => (
                <SelectItem
                  key={w.id}
                  value={encode("external_wallet", w.id)}
                  data-testid={`payment-source-external-${w.id}`}
                >
                  {w.walletType} — {w.address.slice(0, 6)}…{w.address.slice(-4)}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {showBank && verifiedBanks.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Bank accounts
              </SelectLabel>
              {verifiedBanks.map((b) => (
                <SelectItem
                  key={b.id}
                  value={encode("bank", b.id)}
                  data-testid={`payment-source-bank-${b.id}`}
                >
                  {b.bankName} ••{b.last4} ({b.currency})
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {totalAvailable === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No funding sources available. Connect a wallet or link a bank to
              continue.
            </div>
          )}
        </SelectContent>
      </Select>
      {showLiveBalance && value?.kind === "external_wallet" && (
        <div
          className="text-xs text-muted-foreground flex items-center gap-2"
          data-testid="external-wallet-live-balance"
        >
          {liveBalanceQuery.isFetching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching live on-chain balance…
            </>
          ) : liveBalanceQuery.data?.error ? (
            <span className="text-destructive">
              Live balance unavailable: {liveBalanceQuery.data.error}
            </span>
          ) : liveBalanceQuery.data ? (
            <span>
              On-chain: {liveBalanceQuery.data.ethBalance.toFixed(6)} ETH
              {liveBalanceQuery.data.tokens
                .filter((t) => t.balance > 0)
                .map((t) => ` · ${t.balance.toFixed(2)} ${t.symbol}`)
                .join("")}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
