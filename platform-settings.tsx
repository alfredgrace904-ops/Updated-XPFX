import { useEffect, useState } from "react";
import {
  useGetPlatformSettings,
  useUpdatePlatformSettings,
} from "@workspace/api-client-react";
import { Loader2, Save, Settings } from "lucide-react";
import { AdminNotificationsPage } from "@/pages/admin-notifications";
import { SocialMediaAdminPanel } from "@/pages/social-media-admin";

export function PlatformSettingsPage() {
  const { data: settings, isLoading, refetch } = useGetPlatformSettings();
  const updateMutation = useUpdatePlatformSettings();

  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [demoModeEnabled, setDemoModeEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (settings) {
      setTradingEnabled(settings.tradingEnabled);
      setRegistrationEnabled(settings.registrationEnabled);
      setDemoModeEnabled(settings.demoModeEnabled);
      setMaintenanceMode(settings.maintenanceMode);
      setMaintenanceMessage(settings.maintenanceMessage ?? "");
    }
  }, [settings]);

  const save = async () => {
    await updateMutation.mutateAsync({
      data: {
        tradingEnabled,
        registrationEnabled,
        demoModeEnabled,
        maintenanceMode,
        maintenanceMessage: maintenanceMessage.trim(),
      },
    });
    setSavedMsg("Settings saved.");
    refetch();
    setTimeout(() => setSavedMsg(""), 3000);
  };

  if (isLoading || !settings) {
    return (
      <div className="p-4 sm:p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Global controls for the trading platform.</p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl divide-y divide-border">
        <Toggle
          label="Trading Enabled"
          description="When off, all users are blocked from opening or closing trades."
          value={tradingEnabled}
          onChange={setTradingEnabled}
        />
        <Toggle
          label="Registration Enabled"
          description="Allow new users to sign up via the public form."
          value={registrationEnabled}
          onChange={setRegistrationEnabled}
        />
        <Toggle
          label="Demo Mode Available"
          description="Allow visitors to spin up a demo account with seeded balances."
          value={demoModeEnabled}
          onChange={setDemoModeEnabled}
        />
        <Toggle
          label="Maintenance Mode"
          description="Show the maintenance banner to all users."
          value={maintenanceMode}
          onChange={setMaintenanceMode}
        />
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Maintenance Banner Message
        </label>
        <textarea
          value={maintenanceMessage}
          onChange={(e) => setMaintenanceMessage(e.target.value)}
          rows={3}
          placeholder="We'll be back shortly..."
          className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {savedMsg && <p className="text-sm text-primary">{savedMsg}</p>}

      <button
        onClick={save}
        disabled={updateMutation.isPending}
        className="flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </button>

      <div className="border-t border-border pt-6 mt-6">
        <SocialMediaAdminPanel />
      </div>

      <div className="border-t border-border pt-6 mt-6 -mx-4 sm:-mx-6 px-0">
        <div className="px-4 sm:px-0">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Manage admin alert toggles, email destinations, and broadcasts.
          </p>
        </div>
        <div className="-mx-4 sm:-mx-0">
          <AdminNotificationsPage />
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-5 gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
