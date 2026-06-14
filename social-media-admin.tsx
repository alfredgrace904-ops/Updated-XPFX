/**
 * Social Media Management Panel
 * --------------------------------
 * Admin-only panel to configure the platform's social media presence.
 * Each of the five predefined platforms (Facebook, Instagram, Twitter,
 * Telegram, WhatsApp) can be given a username, a URL, and toggled
 * active/inactive. Only active entries appear on the public site.
 */
import { useState, useEffect } from "react";
import {
  Facebook,
  Instagram,
  Twitter,
  Send,
  MessageCircle,
  Globe,
  Save,
  Loader2,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Platform = "facebook" | "instagram" | "twitter" | "telegram" | "whatsapp";

interface SocialEntry {
  platform: Platform;
  label: string;
  username: string;
  url: string;
  active: boolean;
}

const PLATFORM_META: Record<Platform, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  facebook:  { icon: Facebook,       color: "text-blue-500" },
  instagram: { icon: Instagram,      color: "text-pink-500" },
  twitter:   { icon: Twitter,        color: "text-sky-400" },
  telegram:  { icon: Send,           color: "text-cyan-500" },
  whatsapp:  { icon: MessageCircle,  color: "text-green-500" },
};

export function SocialMediaAdminPanel() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<SocialEntry[]>([]);
  const [saving, setSaving] = useState<Platform | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/social-media", { credentials: "include" })
      .then((r) => r.json())
      .then((data: SocialEntry[]) => { setEntries(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const updateLocal = (platform: Platform, field: keyof SocialEntry, value: string | boolean) => {
    setEntries((prev) =>
      prev.map((e) => (e.platform === platform ? { ...e, [field]: value } : e)),
    );
  };

  const save = async (platform: Platform) => {
    const entry = entries.find((e) => e.platform === platform);
    if (!entry) return;

    if (entry.active && !entry.url.trim()) {
      toast({ title: "URL required", description: "Please enter a URL before activating.", variant: "destructive" });
      return;
    }

    setSaving(platform);
    try {
      const res = await fetch(`/api/admin/social-media/${platform}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: entry.username, url: entry.url, active: entry.active }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: `${entry.label} updated` });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading social media settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Share2 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Social Media Links</h2>
          <p className="text-xs text-muted-foreground">
            Only active links are shown publicly. Toggle off to hide from the site.
          </p>
        </div>
      </div>

      <div className="divide-y divide-border rounded-xl border border-card-border bg-card overflow-hidden">
        {entries.map((entry) => {
          const meta = PLATFORM_META[entry.platform];
          const Icon = meta?.icon ?? Globe;
          const isSaving = saving === entry.platform;

          return (
            <div key={entry.platform} className="p-4 md:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Platform icon + label + toggle */}
                <div className="flex items-center gap-3 sm:w-36 shrink-0">
                  <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${meta?.color ?? ""}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                    <span
                      className={`text-[11px] font-medium ${entry.active ? "text-green-500" : "text-muted-foreground"}`}
                    >
                      {entry.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Username
                    </label>
                    <input
                      type="text"
                      value={entry.username}
                      onChange={(e) => updateLocal(entry.platform, "username", e.target.value)}
                      placeholder={`e.g. @XpressProfx`}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      URL
                    </label>
                    <input
                      type="url"
                      value={entry.url}
                      onChange={(e) => updateLocal(entry.platform, "url", e.target.value)}
                      placeholder={`https://${entry.platform}.com/xpressprofx`}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Active toggle + Save */}
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateLocal(entry.platform, "active", !entry.active)}
                    aria-label={`Toggle ${entry.label}`}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                      entry.active ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                        entry.active ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => save(entry.platform)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
