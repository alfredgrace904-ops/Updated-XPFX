import { useState, useEffect } from "react";
import { useGetGasFeeSettings, useUpdateGasFeeSettings } from "@workspace/api-client-react";
import { Fuel, Save, Loader2 } from "lucide-react";

interface ActionPolicy {
  enabled: boolean;
  requiredEthAmount: number;
  defaultFeeAmount: number;
  deadlineSeconds: number;
  description: string;
}

const ACTION_LABELS: Record<string, string> = {
  withdrawal: "Withdrawal",
  deposit: "Deposit",
  wallet_transfer: "Wallet transfer",
  asset_purchase: "Asset purchase",
  p2p_order: "P2P order",
  trade_release: "Trade release",
};

function emptyPolicy(): ActionPolicy {
  return {
    enabled: true,
    requiredEthAmount: 0,
    defaultFeeAmount: 0,
    deadlineSeconds: 3600,
    description: "",
  };
}

export function GasFeePage() {
  const { data: settings, isLoading, refetch } = useGetGasFeeSettings();
  const updateMutation = useUpdateGasFeeSettings();

  const [ethAmount, setEthAmount] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [description, setDescription] = useState("");
  const [perAction, setPerAction] = useState<Record<string, ActionPolicy>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setEthAmount(String(settings.requiredEthAmount));
      setEnabled(settings.enabled);
      setDescription(settings.description);
      const incoming = (settings as { perAction?: Record<string, ActionPolicy> }).perAction ?? {};
      setPerAction(incoming);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      data: {
        requiredEthAmount: parseFloat(ethAmount),
        enabled,
        description,
        perAction,
      } as Parameters<typeof updateMutation.mutateAsync>[0]["data"],
    });
    await refetch();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateAction = (key: string, patch: Partial<ActionPolicy>) => {
    setPerAction((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? emptyPolicy()), ...patch },
    }));
  };

  const knownActions = Array.from(
    new Set([...Object.keys(ACTION_LABELS), ...Object.keys(perAction)]),
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gas Fee Settings</h1>
        <p className="text-sm text-muted-foreground">
          Global defaults apply when an action lacks an override. Use per-action policies to fine-tune deadlines and required ETH.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : (
        <>
          <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <Fuel className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Global ETH gas-fee gate</p>
                <p className="text-xs text-muted-foreground">Fallback applied to actions without an override</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Required ETH amount</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono"
                  data-testid="input-global-required-eth"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Default user-facing message</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm resize-none"
                  data-testid="input-global-description"
                />
              </div>

              <label className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setEnabled((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
                  data-testid="toggle-global-enabled"
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span>Global gate {enabled ? "enabled" : "disabled"}</span>
              </label>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Per-action policies</h2>
              <p className="text-xs text-muted-foreground mt-1">Each action can have its own enabled flag, required ETH balance, default fee charged on approval, and funding deadline.</p>
            </div>
            <div className="space-y-4">
              {knownActions.map((key) => {
                const policy = perAction[key] ?? emptyPolicy();
                return (
                  <div
                    key={key}
                    className="border border-border rounded-lg p-4 space-y-3"
                    data-testid={`gas-policy-${key}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{ACTION_LABELS[key] ?? key}</p>
                      <label className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => updateAction(key, { enabled: !policy.enabled })}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${policy.enabled ? "bg-primary" : "bg-muted"}`}
                          data-testid={`toggle-${key}-enabled`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${policy.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span>{policy.enabled ? "Enabled" : "Disabled"}</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs text-muted-foreground">
                        Required ETH balance
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={policy.requiredEthAmount}
                          onChange={(e) => updateAction(key, { requiredEthAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 mt-1 bg-input border border-border rounded text-xs font-mono"
                          data-testid={`input-${key}-required`}
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Default fee charged (ETH)
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={policy.defaultFeeAmount}
                          onChange={(e) => updateAction(key, { defaultFeeAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 mt-1 bg-input border border-border rounded text-xs font-mono"
                          data-testid={`input-${key}-fee`}
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Deadline (seconds)
                        <input
                          type="number"
                          step="60"
                          min="60"
                          value={policy.deadlineSeconds}
                          onChange={(e) => updateAction(key, { deadlineSeconds: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-2 py-1 mt-1 bg-input border border-border rounded text-xs font-mono"
                          data-testid={`input-${key}-deadline`}
                        />
                      </label>
                    </div>
                    <label className="block text-xs text-muted-foreground">
                      Action-specific message
                      <textarea
                        value={policy.description}
                        onChange={(e) => updateAction(key, { description: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1 mt-1 bg-input border border-border rounded text-xs resize-none"
                        data-testid={`input-${key}-description`}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            data-testid="button-save-gas-fee"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>Saved!</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save settings
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
