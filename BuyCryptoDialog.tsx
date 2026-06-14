/**
 * BuyCryptoDialog
 * ---------------
 * Multi-step dialog used by Wallets / Dashboard to start a MoonPay buy-
 * crypto checkout. The dialog is gated on the user owning at least one
 * verified bank account, and walks the user through:
 *
 *   1. Choose a crypto asset (BTC / ETH / USDT / USDC / SOL).
 *   2. Enter a fiat amount (defaults to the bank's currency).
 *   3. Choose a destination wallet — either a connected external wallet,
 *      a platform wallet (when its address is set), or a custom address
 *      typed in by the user.
 *
 * On confirm, we call POST /moonpay/initiate to obtain a hosted-checkout
 * URL and open it in a new tab. If the server has no MOONPAY_API_KEY
 * configured, the URL points at MoonPay's sandbox host and we surface the
 * server-provided notice so the user understands they're previewing the
 * flow rather than spending real money.
 */
import { useEffect, useMemo, useState } from "react";
import {
  useInitiateMoonpayBuy,
  useInitiateCoinbaseBuy,
  useGetConnectedWallets,
  useGetWallets,
  useGetCurrentUser,
  useGetAssetCatalog,
  useGetExchangeAvailability,
} from "@workspace/api-client-react";
import type { BankAccount } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink, ChevronRight, ChevronLeft } from "lucide-react";

interface Props {
  banks: BankAccount[] | undefined;
  triggerLabel?: string;
  triggerVariant?: "default" | "secondary" | "outline";
  triggerSize?: "default" | "sm";
  className?: string;
}

export function BuyCryptoDialog({
  banks,
  triggerLabel = "Buy crypto",
  triggerVariant = "default",
  triggerSize = "default",
  className,
}: Props) {
  const verifiedBank = useMemo(
    () => banks?.find((b) => b.verified),
    [banks],
  );
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [asset, setAsset] = useState<string>("BTC");
  const [fiatAmount, setFiatAmount] = useState<string>("100");
  const [fiatCurrency, setFiatCurrency] = useState<string>(
    verifiedBank?.fiatCurrency || verifiedBank?.currency || "USD",
  );
  const [destinationKind, setDestinationKind] = useState<
    "platform" | "external" | "custom"
  >("external");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [customAddress, setCustomAddress] = useState<string>("");
  // Payment source — Bank/Card (always available, routed via MoonPay or
  // Coinbase as the on-ramp) OR an already-linked exchange-account wallet
  // whose KYC/profile pre-fills the checkout.
  type PaymentSource =
    | "bank_moonpay"
    | "bank_coinbase"
    | "exchange_moonpay"
    | "exchange_coinbase";
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("bank_moonpay");

  const { data: connectedWallets } = useGetConnectedWallets();
  const { data: wallets } = useGetWallets();
  const { data: currentUser } = useGetCurrentUser();
  const { data: assetCatalog, isLoading: isLoadingAssets } =
    useGetAssetCatalog();
  const { data: availability } = useGetExchangeAvailability();
  const initiate = useInitiateMoonpayBuy();
  const initiateCoinbase = useInitiateCoinbaseBuy();
  const moonpaySupported = availability?.moonpaySupported !== false;
  const moonpayUnsupportedReason = availability?.moonpayUnsupportedReason ?? null;
  // Bank/Card paths are ALWAYS available (subject to region for MoonPay).
  // Exchange-account paths require the user to have linked that exchange.
  const moonpayLinked = (connectedWallets ?? []).some(
    (w) => w.provider === "moonpay",
  );
  const coinbaseLinked = (connectedWallets ?? []).some(
    (w) => w.provider === "coinbase",
  );
  const sourceDisabled: Record<PaymentSource, boolean> = {
    bank_moonpay: !moonpaySupported,
    bank_coinbase: false,
    exchange_moonpay: !moonpaySupported || !moonpayLinked,
    exchange_coinbase: !coinbaseLinked,
  };
  // If the current selection is unavailable (region-blocked or unlinked),
  // fall back to Bank/Card via the other rail.
  useEffect(() => {
    if (sourceDisabled[paymentSource]) {
      const fallback: PaymentSource = !sourceDisabled.bank_moonpay
        ? "bank_moonpay"
        : "bank_coinbase";
      setPaymentSource(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moonpaySupported, moonpayLinked, coinbaseLinked]);
  const onRamp: "moonpay" | "coinbase" =
    paymentSource === "bank_coinbase" || paymentSource === "exchange_coinbase"
      ? "coinbase"
      : "moonpay";
  const isExchangeSource =
    paymentSource === "exchange_moonpay" || paymentSource === "exchange_coinbase";
  const selectedSourceDisabled = sourceDisabled[paymentSource];
  const { toast } = useToast();
  const moonpayEmail = currentUser?.moonpayEmail ?? null;
  const accountEmail = currentUser?.email ?? "";

  // Sourced from the platform asset catalog so any asset configured by
  // an admin appears here (no hard-coded list). De-duped by symbol in
  // case the catalog has multiple rows for the same ticker.
  const assetOptions = useMemo(() => {
    const seen = new Set<string>();
    const items = (assetCatalog ?? [])
      .filter((a) => a.available !== false)
      .filter((a) => {
        const sym = a.symbol.toUpperCase();
        if (seen.has(sym)) return false;
        seen.add(sym);
        return true;
      })
      .map((a) => ({
        code: a.symbol.toUpperCase(),
        name: a.name,
        // Catalog prices are quoted in `currency` (typically USD).
        priceUsd: a.price,
        priceCurrency: (a.currency || "USD").toUpperCase(),
      }));
    items.sort((a, b) => a.code.localeCompare(b.code));
    return items;
  }, [assetCatalog]);

  // If the catalog loads and the currently-selected asset isn't in it,
  // fall back to the first available asset so the form stays valid.
  useEffect(() => {
    if (assetOptions.length === 0) return;
    if (!assetOptions.some((a) => a.code === asset)) {
      setAsset(assetOptions[0]!.code);
    }
  }, [assetOptions, asset]);

  const selectedAsset = assetOptions.find((a) => a.code === asset);

  // Best-effort estimate: catalog prices are USD, so we only show an
  // estimate when the user is paying in USD (or the catalog explicitly
  // matches the chosen fiat currency). Otherwise we surface a clear
  // disclaimer rather than guess.
  const fiatAmountForEstimate = Number(fiatAmount);
  const canEstimate =
    !!selectedAsset &&
    selectedAsset.priceUsd > 0 &&
    fiatAmountForEstimate > 0 &&
    selectedAsset.priceCurrency === fiatCurrency.toUpperCase();
  const estimatedCryptoAmount = canEstimate
    ? fiatAmountForEstimate / selectedAsset!.priceUsd
    : null;

  const platformWalletOptions = useMemo(
    () =>
      (wallets ?? []).filter(
        (w) => w.address && w.address !== "" && w.type !== "social",
      ),
    [wallets],
  );

  const externalWalletOptions = connectedWallets ?? [];

  const reset = () => {
    setStep(1);
    setAsset("BTC");
    setFiatAmount("100");
    setFiatCurrency(verifiedBank?.fiatCurrency || verifiedBank?.currency || "USD");
    setDestinationKind("external");
    setDestinationAddress("");
    setCustomAddress("");
    setPaymentSource(moonpaySupported ? "bank_moonpay" : "bank_coinbase");
  };

  const fiatAmountNum = Number(fiatAmount);
  const canStep1 = !!asset;
  const canStep2 = fiatAmountNum >= 1 && fiatCurrency.length === 3;
  const resolvedAddress =
    destinationKind === "custom"
      ? customAddress.trim()
      : destinationAddress.trim();
  const canSubmit =
    canStep1 && canStep2 && resolvedAddress.length > 0 && !selectedSourceDisabled;

  const submit = async () => {
    if (!canSubmit) return;
    const providerLabel = onRamp === "moonpay" ? "MoonPay" : "Coinbase";
    try {
      const payload = {
        assetSymbol: asset,
        fiatAmount: fiatAmountNum,
        fiatCurrency: fiatCurrency.toUpperCase(),
        destinationAddress: resolvedAddress,
        destinationKind,
      };
      const resp =
        onRamp === "coinbase"
          ? await initiateCoinbase.mutateAsync({ data: payload })
          : await initiate.mutateAsync({ data: payload });
      window.open(resp.url, "_blank", "noopener,noreferrer");
      toast({
        title: resp.sandbox
          ? `${providerLabel} sandbox opened`
          : `${providerLabel} checkout opened`,
        description: resp.notice
          ? resp.notice
          : `Complete your purchase of ${asset} in the new tab.`,
      });
      setOpen(false);
      reset();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Could not start ${providerLabel} checkout.`;
      toast({
        title: `${providerLabel} failed`,
        description: message,
        variant: "destructive",
      });
    }
  };

  const submitting =
    onRamp === "moonpay" ? initiate.isPending : initiateCoinbase.isPending;

  // Per spec, the Buy Crypto entry point only exists when the user
  // owns at least one verified bank account. Render nothing rather
  // than a disabled button so the action isn't visually advertised
  // to users who can't yet use it.
  if (!verifiedBank) {
    return null;
  }

  const trigger = (
    <Button
      variant={triggerVariant}
      size={triggerSize}
      className={className}
      data-testid="button-buy-crypto"
    >
      <CreditCard className="h-4 w-4 mr-2" />
      {triggerLabel}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Buy crypto with {onRamp === "moonpay" ? "MoonPay" : "Coinbase"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 — funded from {verifiedBank.bankName} ····
            {verifiedBank.last4}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment source</Label>
              <Select
                value={paymentSource}
                onValueChange={(v) => setPaymentSource(v as PaymentSource)}
              >
                <SelectTrigger data-testid="select-buy-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="bank_moonpay"
                    disabled={sourceDisabled.bank_moonpay}
                  >
                    Bank / Card via MoonPay
                    {!moonpaySupported ? " — unavailable in your region" : ""}
                  </SelectItem>
                  <SelectItem
                    value="bank_coinbase"
                    disabled={sourceDisabled.bank_coinbase}
                  >
                    Bank / Card via Coinbase
                  </SelectItem>
                  <SelectItem
                    value="exchange_moonpay"
                    disabled={sourceDisabled.exchange_moonpay}
                  >
                    MoonPay exchange account
                    {!moonpaySupported
                      ? " — unavailable in your region"
                      : !moonpayLinked
                        ? " — connect first"
                        : ""}
                  </SelectItem>
                  <SelectItem
                    value="exchange_coinbase"
                    disabled={sourceDisabled.exchange_coinbase}
                  >
                    Coinbase exchange account
                    {!coinbaseLinked ? " — connect first" : ""}
                  </SelectItem>
                </SelectContent>
              </Select>
              {!moonpaySupported && moonpayUnsupportedReason && (
                <p className="text-xs text-amber-500" data-testid="text-buy-region-block">
                  {moonpayUnsupportedReason}
                </p>
              )}
              {isExchangeSource && (
                <p className="text-[11px] text-muted-foreground">
                  Funded from your linked{" "}
                  {onRamp === "moonpay" ? "MoonPay" : "Coinbase"} exchange account.
                </p>
              )}
              {!isExchangeSource && (
                <p className="text-[11px] text-muted-foreground">
                  Funded directly from{" "}
                  <span className="font-medium">
                    {verifiedBank.bankName} ····{verifiedBank.last4}
                  </span>
                  .
                </p>
              )}
              {((onRamp === "moonpay" && !moonpayLinked) ||
                (onRamp === "coinbase" && !coinbaseLinked)) && (
                <div
                  className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs flex items-start justify-between gap-2"
                  data-testid="banner-buy-connect-first"
                >
                  <span>
                    {onRamp === "moonpay" ? "MoonPay" : "Coinbase"} exchange
                    account isn't linked — connect first to use it as a source.
                  </span>
                  <Link href="/wallets">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="button-buy-connect-first"
                    >
                      Connect first
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Asset to buy</Label>
              {isLoadingAssets ? (
                <div
                  className="text-xs text-muted-foreground"
                  data-testid="text-buy-asset-loading"
                >
                  Loading platform assets…
                </div>
              ) : assetOptions.length === 0 ? (
                <div className="text-xs text-amber-500">
                  No assets are currently available in the platform catalog.
                </div>
              ) : (
                <Select value={asset} onValueChange={setAsset}>
                  <SelectTrigger data-testid="select-buy-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {assetOptions.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedAsset && selectedAsset.priceUsd > 0 && (
              <p
                className="text-xs text-muted-foreground"
                data-testid="text-buy-asset-price"
              >
                Indicative price:{" "}
                <span className="font-mono text-foreground">
                  {selectedAsset.priceUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {selectedAsset.priceCurrency}
                </span>{" "}
                / 1 {selectedAsset.code}. MoonPay will quote the live rate
                at checkout.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="fiat-amount">Amount</Label>
                <Input
                  id="fiat-amount"
                  inputMode="decimal"
                  value={fiatAmount}
                  onChange={(e) => setFiatAmount(e.target.value)}
                  data-testid="input-buy-fiat-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={fiatCurrency}
                  onValueChange={setFiatCurrency}
                >
                  <SelectTrigger data-testid="select-buy-fiat-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div
              className="rounded-md border bg-muted/30 p-3 space-y-1"
              data-testid="buy-estimate"
            >
              <div className="text-xs text-muted-foreground">
                Estimated {selectedAsset?.code ?? asset} you'll receive
              </div>
              {estimatedCryptoAmount !== null && selectedAsset ? (
                <div
                  className="text-lg font-semibold font-mono"
                  data-testid="text-buy-estimate-amount"
                >
                  ≈{" "}
                  {estimatedCryptoAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8,
                  })}{" "}
                  {selectedAsset.code}
                </div>
              ) : (
                <div
                  className="text-sm font-medium text-muted-foreground"
                  data-testid="text-buy-estimate-unavailable"
                >
                  {selectedAsset && selectedAsset.priceUsd > 0
                    ? `Live estimate is shown when paying in ${selectedAsset.priceCurrency}. MoonPay will quote the exact ${selectedAsset.code} amount at checkout.`
                    : "MoonPay will quote the exact crypto amount at checkout."}
                </div>
              )}
              {selectedAsset && selectedAsset.priceUsd > 0 && canEstimate && (
                <div className="text-[11px] text-muted-foreground">
                  Based on the platform indicative price of{" "}
                  {selectedAsset.priceUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {selectedAsset.priceCurrency} / {selectedAsset.code}. The
                  final rate is set by MoonPay.
                </div>
              )}
            </div>
            {verifiedBank.fiatBalance > 0 && fiatAmountNum > verifiedBank.fiatBalance && (
              <p className="text-xs text-amber-500">
                Heads up: your reported {verifiedBank.fiatCurrency} balance on
                this bank is{" "}
                {verifiedBank.fiatBalance.toLocaleString()}{" "}
                {verifiedBank.fiatCurrency} — MoonPay may decline if your
                bank can't cover this amount.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div
              className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1"
              data-testid="moonpay-email-notice"
            >
              <div className="font-medium text-foreground">
                MoonPay checkout email
              </div>
              {moonpayEmail ? (
                <div>
                  We'll pre-fill <span className="font-mono">{moonpayEmail}</span>{" "}
                  on the MoonPay screen. If MoonPay doesn't match an account
                  with this email, you can change it on the next screen or{" "}
                  <Link
                    href="/settings"
                    className="text-primary hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    update it in Settings
                  </Link>
                  .
                </div>
              ) : (
                <div>
                  We'll pre-fill your account email{" "}
                  <span className="font-mono">{accountEmail}</span>. If your
                  MoonPay account uses a different email,{" "}
                  <Link
                    href="/settings"
                    className="text-primary hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    set a MoonPay email in Settings
                  </Link>{" "}
                  so checkouts auto-fill correctly.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Send the crypto to</Label>
              <Select
                value={destinationKind}
                onValueChange={(v) => {
                  setDestinationKind(v as typeof destinationKind);
                  setDestinationAddress("");
                }}
              >
                <SelectTrigger data-testid="select-buy-destination-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">
                    Connected external wallet
                  </SelectItem>
                  <SelectItem value="platform">
                    My platform wallet
                  </SelectItem>
                  <SelectItem value="custom">Other / custom address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {destinationKind === "external" && (
              <div className="space-y-2">
                <Label>Wallet</Label>
                {externalWalletOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    You haven't connected an external wallet yet. Pick a
                    different destination or connect one from the Wallets
                    page.
                  </p>
                ) : (
                  <Select
                    value={destinationAddress}
                    onValueChange={setDestinationAddress}
                  >
                    <SelectTrigger data-testid="select-buy-external-wallet">
                      <SelectValue placeholder="Choose a wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {externalWalletOptions.map((w) => (
                        <SelectItem key={w.id} value={w.address}>
                          {w.walletType} — {w.address.slice(0, 8)}…
                          {w.address.slice(-4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {destinationKind === "platform" && (
              <div className="space-y-2">
                <Label>Platform wallet</Label>
                {platformWalletOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Your platform wallets don't have on-chain receiving
                    addresses set yet. Pick a different destination.
                  </p>
                ) : (
                  <Select
                    value={destinationAddress}
                    onValueChange={setDestinationAddress}
                  >
                    <SelectTrigger data-testid="select-buy-platform-wallet">
                      <SelectValue placeholder="Choose a wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformWalletOptions.map((w) => (
                        <SelectItem key={w.id} value={w.address}>
                          {w.label} ({w.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {destinationKind === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-address">Wallet address</Label>
                <Input
                  id="custom-address"
                  placeholder="0x… or your asset's native address"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  data-testid="input-buy-custom-address"
                />
                <p className="text-xs text-muted-foreground">
                  Make sure the address belongs to the same network as the
                  asset you're buying. Sending {asset} to the wrong network
                  may result in a permanent loss of funds.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div
            className="text-xs text-muted-foreground border-t pt-3"
            data-testid="moonpay-first-use-fallback"
          >
            You may need to complete your MoonPay profile on first use.{" "}
            <Link
              href="/settings"
              className="text-primary hover:underline"
              onClick={() => setOpen(false)}
              data-testid="link-moonpay-settings-shortcut"
            >
              Link your MoonPay account in Settings
            </Link>{" "}
            to streamline future purchases.
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 1 && canStep1) setStep(2);
                else if (step === 2 && canStep2) setStep(3);
              }}
              disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
              className="w-full sm:w-auto"
              data-testid="button-buy-next"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full sm:w-auto"
              data-testid="button-buy-submit"
            >
              {submitting ? (
                `Opening ${onRamp === "moonpay" ? "MoonPay" : "Coinbase"}…`
              ) : (
                <>
                  Open {onRamp === "moonpay" ? "MoonPay" : "Coinbase"}{" "}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
