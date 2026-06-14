import { useEffect, useState } from "react";
import {
  useGetCurrentUser,
  useGetSelectedManager,
  useGetWallets,
  useUpdateOwnProfile,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ShieldCheck, Mail, MapPin, Wallet, ArrowRight, CreditCard } from "lucide-react";
import { format } from "date-fns";

export function Settings() {
  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser();
  const { data: managerRes, isLoading: isLoadingManager } = useGetSelectedManager();
  const { data: wallets, isLoading: isLoadingWallets } = useGetWallets();
  const updateProfile = useUpdateOwnProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [moonpayEmail, setMoonpayEmail] = useState("");
  useEffect(() => {
    setMoonpayEmail(user?.moonpayEmail ?? "");
  }, [user?.moonpayEmail]);

  const handleSaveMoonpayEmail = async () => {
    const trimmed = moonpayEmail.trim();
    const payload = trimmed.length === 0 ? null : trimmed;
    if (payload && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address or leave blank to clear.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateProfile.mutateAsync({ data: { moonpayEmail: payload } });
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({
        title: "MoonPay email saved",
        description: payload
          ? `Buy Crypto checkouts will pre-fill ${payload}.`
          : "MoonPay email cleared.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update MoonPay email.";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and platform preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingUser ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.avatarUrl} />
                      <AvatarFallback className="text-2xl">{user?.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-2xl font-bold">{user?.fullName}</h3>
                      <p className="text-muted-foreground">@{user?.username}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {user?.kycVerified ? (
                          <Badge variant="outline" className="text-success border-success bg-success/10"><ShieldCheck className="h-3 w-3 mr-1" /> KYC Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning border-warning bg-warning/10">KYC Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" /> Email Address</div>
                      <div className="font-medium">{user?.email}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Country</div>
                      <div className="font-medium">{user?.country}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Member Since</div>
                      <div className="font-medium">{user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '-'}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-moonpay-email">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> MoonPay Checkout Email
              </CardTitle>
              <CardDescription>
                Optional: pre-fill this email when launching the
                MoonPay-hosted Buy Crypto flow. Leave blank to use your
                account email each time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingUser ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="moonpay-email">MoonPay email</Label>
                    <Input
                      id="moonpay-email"
                      type="email"
                      placeholder="you@example.com"
                      value={moonpayEmail}
                      onChange={(e) => setMoonpayEmail(e.target.value)}
                      data-testid="input-moonpay-email"
                    />
                    <p className="text-xs text-muted-foreground">
                      Account email on file: {user?.email}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveMoonpayEmail}
                      disabled={
                        updateProfile.isPending ||
                        (moonpayEmail.trim() === (user?.moonpayEmail ?? ""))
                      }
                      data-testid="button-save-moonpay-email"
                    >
                      {updateProfile.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connected Wallets</CardTitle>
              <CardDescription>Accounts linked to your profile</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWallets ? (
                <Skeleton className="h-20 w-full" />
              ) : wallets?.length === 0 ? (
                <p className="text-muted-foreground">No wallets connected.</p>
              ) : (
                <div className="space-y-4">
                  {wallets?.map(w => (
                    <div key={w.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium capitalize">{w.label} <Badge variant="secondary" className="ml-2 text-[10px]">{w.type}</Badge></div>
                          <div className="text-xs text-muted-foreground font-mono">{w.address.slice(0,6)}...{w.address.slice(-4)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{w.balance.toLocaleString()} {w.currency}</div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link href="/wallets" className="text-primary text-sm font-medium hover:underline inline-flex items-center">
                      Manage wallets <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Social Manager</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingManager ? (
                <Skeleton className="h-32 w-full" />
              ) : managerRes?.manager ? (
                <div className="space-y-4 text-center">
                  <Avatar className="h-16 w-16 mx-auto">
                    <AvatarImage src={managerRes.manager.avatarUrl} />
                    <AvatarFallback>{managerRes.manager.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold">{managerRes.manager.name}</h4>
                    <p className="text-sm text-muted-foreground">{managerRes.manager.title}</p>
                  </div>
                  <Link href="/managers" className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    Change Manager
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm mb-4">No account manager selected for copy trading.</p>
                  <Link href="/managers" className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                    Browse Managers
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span>Two-Factor Auth</span>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Withdrawal Whitelist</span>
                <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
