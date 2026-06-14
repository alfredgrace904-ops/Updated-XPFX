import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetAdminUsers,
  useCreateAdminUser,
} from "@workspace/api-client-react";
import { Search, ChevronRight, Plus, X, Loader2 } from "lucide-react";

export function UsersPage() {
  const { data: users, isLoading, refetch } = useGetAdminUsers();
  const createMutation = useCreateAdminUser();
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);

  const filtered = (users ?? []).filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">All registered accounts. Click to manage.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">KYC</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flags</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No users found.</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/users/${u.id}`)}
                    className="hover:bg-accent/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.country}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === "admin" ? "bg-primary/20 text-primary" :
                        u.role === "demo" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        u.kycStatus === "approved" ? "bg-green-500/20 text-green-400" :
                        u.kycStatus === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        u.kycStatus === "rejected" ? "bg-red-500/20 text-red-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {u.kycStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {u.merchant && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">P2P</span>
                        )}
                        {u.tradingLocked && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">Locked</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ${u.balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          isPending={createMutation.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={async (data) => {
            const created = await createMutation.mutateAsync({ data });
            setShowCreate(false);
            refetch();
            navigate(`/users/${created.id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: Parameters<ReturnType<typeof useCreateAdminUser>["mutateAsync"]>[0]["data"]) => Promise<void>;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    country: "",
    username: "",
    phone: "",
    role: "user" as "user" | "admin" | "demo",
    kycVerified: false,
    merchant: false,
  });
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.email || !form.password || !form.fullName || !form.country) {
      setError("Email, password, full name and country are required.");
      return;
    }
    setError("");
    try {
      const email = form.email.trim();
      await onSubmit({
        email,
        password: form.password,
        fullName: form.fullName.trim(),
        country: form.country.trim(),
        username: form.username.trim() || (email.split("@")[0] ?? "trader"),
        role: form.role,
        kycVerified: form.kycVerified,
        merchant: form.merchant,
        phone: form.phone.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-card-border rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">New User (OTP bypass)</h3>
            <p className="text-xs text-muted-foreground">Created instantly without email verification.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <Field label="Full name *">
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <Field label="Email *">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <Field label="Password *">
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country *">
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="US" className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
            </Field>
            <Field label="Username">
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
            </Field>
          </div>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm" />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="demo">demo</option>
            </select>
          </Field>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.kycVerified} onChange={(e) => setForm({ ...form, kycVerified: e.target.checked })} />
              KYC pre-verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.checked })} />
              Approve as P2P merchant
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={submit}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
