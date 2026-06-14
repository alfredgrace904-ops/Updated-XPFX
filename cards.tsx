/**
 * Cards page
 * ----------
 * Lets the customer request a new XpressPro FX debit / credit card,
 * preview design templates (or a randomized "Surprise me" custom design),
 * fully customise the colours, and review their existing card requests.
 *
 * All new cards start in the `pending` state — an admin must approve them
 * from the Admin console before they become spendable.
 */
import { useMemo, useState } from "react";
import {
  useGetCards,
  useRequestCard,
  useUpdateCardDesign,
  useCancelCard,
  useGetKycStatus,
  getGetCardsQueryKey,
} from "@workspace/api-client-react";
import type { BrokerCard, CardDesign } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  CreditCard,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { CardPreview } from "@/components/cards/CardPreview";
import { CARD_TEMPLATES, randomCardDesign } from "@/lib/card-templates";

type Brand = "visa" | "mastercard" | "amex" | "xpresspro";
type CardType = "debit" | "credit";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

export function Cards() {
  const { user } = useAuth();
  const { data: cards, isLoading } = useGetCards();
  const { data: kyc } = useGetKycStatus();
  const requestMutation = useRequestCard();
  const updateMutation = useUpdateCardDesign();
  const cancelMutation = useCancelCard();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [type, setType] = useState<CardType>("debit");
  const [brand, setBrand] = useState<Brand>("xpresspro");
  const [creditLimit, setCreditLimit] = useState("5000");
  const [design, setDesign] = useState<CardDesign>(CARD_TEMPLATES[0]!.design);
  const [flipped, setFlipped] = useState(false);

  const [editTarget, setEditTarget] = useState<BrokerCard | null>(null);
  const [editDesign, setEditDesign] = useState<CardDesign | null>(null);

  const kycApproved = kyc?.status === "approved";

  const previewHolder = useMemo(
    () => (user?.fullName ?? "Card holder").toUpperCase(),
    [user],
  );

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetCardsQueryKey() });
  };

  const submitRequest = async () => {
    try {
      await requestMutation.mutateAsync({
        data: {
          type,
          brand,
          currency: "USD",
          creditLimit: type === "credit" ? Number(creditLimit) : null,
          design,
        },
      });
      await refresh();
      toast({
        title: "Card requested",
        description: "Your card is pending admin approval.",
      });
    } catch (e: unknown) {
      toast({
        title: "Request failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitEdit = async () => {
    if (!editTarget || !editDesign) return;
    try {
      await updateMutation.mutateAsync({
        cardId: editTarget.id,
        data: { design: editDesign },
      });
      await refresh();
      toast({ title: "Design updated" });
      setEditTarget(null);
      setEditDesign(null);
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync({ cardId: id });
      await refresh();
      toast({ title: "Card cancelled" });
    } catch (e: unknown) {
      toast({
        title: "Cancellation failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Cards</h1>
          <p className="text-muted-foreground text-sm">
            Order a branded debit or credit card and pick a design that suits
            you. All requests are reviewed by our team before activation.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <CreditCard className="h-3.5 w-3.5" /> {cards?.length ?? 0} cards
        </Badge>
      </div>

      {!kycApproved && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="font-medium">KYC verification required</div>
              <div className="text-sm text-muted-foreground">
                Complete KYC before requesting a card.
              </div>
            </div>
            <Link href="/kyc">
              <Button size="sm" variant="secondary">Go to KYC</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request" data-testid="tab-card-request">Request a card</TabsTrigger>
          <TabsTrigger value="my-cards" data-testid="tab-my-cards">My cards</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Card details</CardTitle>
                <CardDescription>Pick the type, brand and design.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as CardType)}>
                      <SelectTrigger data-testid="select-card-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Select value={brand} onValueChange={(v) => setBrand(v as Brand)}>
                      <SelectTrigger data-testid="select-card-brand">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xpresspro">XpressPro</SelectItem>
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="mastercard">Mastercard</SelectItem>
                        <SelectItem value="amex">Amex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {type === "credit" && (
                  <div className="space-y-2">
                    <Label htmlFor="credit-limit">Requested credit limit (USD)</Label>
                    <Input
                      id="credit-limit"
                      type="number"
                      min="500"
                      step="100"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Design templates</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDesign(randomCardDesign())}
                      data-testid="button-randomize-design"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Surprise me
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CARD_TEMPLATES.map((tpl) => {
                      const active = design.templateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setDesign(tpl.design)}
                          data-testid={`tpl-${tpl.id}`}
                          className={`relative aspect-[1.586/1] rounded-lg overflow-hidden border-2 transition ${active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"}`}
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${tpl.design.primaryColor} 0%, ${tpl.design.secondaryColor} 60%, ${tpl.design.accentColor} 100%)`,
                          }}
                        >
                          <span className={`absolute bottom-1 left-1 right-1 text-[10px] font-semibold uppercase tracking-wider ${tpl.design.textColor === "light" ? "text-white/90" : "text-slate-900"}`}>
                            {tpl.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <CustomDesignEditor design={design} setDesign={setDesign} />

                <Button
                  className="w-full"
                  onClick={submitRequest}
                  disabled={!kycApproved || requestMutation.isPending}
                  data-testid="button-request-card"
                >
                  {requestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Request card
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live preview</CardTitle>
                <CardDescription>This is what your card will look like.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <CardPreview
                  design={design}
                  type={type}
                  brand={brand}
                  last4="1234"
                  holderName={previewHolder}
                  expiry="04/30"
                  flipped={flipped}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFlipped((f) => !f)}
                  data-testid="button-flip-card"
                >
                  <RotateCw className="h-3.5 w-3.5 mr-1" /> Flip card
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-cards" className="space-y-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !cards || cards.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You haven't requested any cards yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {cards.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base capitalize">
                        {c.brand} {c.type}
                      </CardTitle>
                      <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Requested {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-3">
                    <CardPreview
                      design={c.design}
                      type={c.type}
                      brand={c.brand}
                      last4={c.last4}
                      holderName={c.holderName}
                      expiry={c.expiry}
                    />
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditTarget(c);
                          setEditDesign(c.design);
                        }}
                        disabled={c.status === "cancelled"}
                        data-testid={`button-edit-${c.id}`}
                      >
                        Edit design
                      </Button>
                      {c.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => submitCancel(c.id)}
                          data-testid={`button-cancel-${c.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                    {c.rejectionReason && (
                      <div className="text-xs text-destructive text-center">
                        {c.rejectionReason}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs w-full">
                      <Stat label="Currency" value={c.currency} />
                      <Stat label="Balance" value={`$${c.balance.toFixed(2)}`} />
                      <Stat
                        label={c.type === "credit" ? "Credit limit" : "Spend limit"}
                        value={`$${(c.creditLimit ?? c.spendLimit).toLocaleString()}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            setEditDesign(null);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit card design</DialogTitle>
            <DialogDescription>
              Pick a new template or build your own — the change is applied
              instantly.
            </DialogDescription>
          </DialogHeader>
          {editTarget && editDesign && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex justify-center">
                <CardPreview
                  design={editDesign}
                  type={editTarget.type}
                  brand={editTarget.brand}
                  last4={editTarget.last4}
                  holderName={editTarget.holderName}
                  expiry={editTarget.expiry}
                />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {CARD_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setEditDesign(tpl.design)}
                      className={`aspect-[1.586/1] rounded-md border-2 ${editDesign.templateId === tpl.id ? "border-primary" : "border-border"}`}
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${tpl.design.primaryColor} 0%, ${tpl.design.secondaryColor} 60%, ${tpl.design.accentColor} 100%)`,
                      }}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditDesign(randomCardDesign())}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Surprise me
                </Button>
                <CustomDesignEditor design={editDesign} setDesign={setEditDesign} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTarget(null);
                setEditDesign(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save design
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  );
}

function CustomDesignEditor({
  design,
  setDesign,
}: {
  design: CardDesign;
  setDesign: (d: CardDesign) => void;
}) {
  const update = (patch: Partial<CardDesign>) =>
    setDesign({ ...design, ...patch, templateId: "custom" });
  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-card/30">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Customise
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ColorField label="Primary" value={design.primaryColor} onChange={(v) => update({ primaryColor: v })} />
        <ColorField label="Secondary" value={design.secondaryColor} onChange={(v) => update({ secondaryColor: v })} />
        <ColorField label="Accent" value={design.accentColor} onChange={(v) => update({ accentColor: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Pattern</Label>
          <Select
            value={design.pattern}
            onValueChange={(v) => update({ pattern: v as CardDesign["pattern"] })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
              <SelectItem value="mesh">Mesh</SelectItem>
              <SelectItem value="waves">Waves</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="carbon">Carbon weave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Text colour</Label>
          <Select
            value={design.textColor}
            onValueChange={(v) => update({ textColor: v as "light" | "dark" })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border border-border cursor-pointer bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs font-mono"
        />
      </div>
    </div>
  );
}
