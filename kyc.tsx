import { useState } from "react";
import { useGetKycStatus, useSubmitKyc, getGetKycStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Kyc() {
  const { data: kycStatus, isLoading: isLoadingKyc } = useGetKycStatus();
  const submitMutation = useSubmitKyc();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [idType, setIdType] = useState<"passport" | "drivers_license" | "national_id">("passport");
  const [idNumber, setIdNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitMutation.mutateAsync({
        data: { idType, idNumber, addressLine1, city, country },
      });
      queryClient.invalidateQueries({ queryKey: getGetKycStatusQueryKey() });
      toast({ title: "KYC Submitted", description: "Your documents are now under review." });
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit KYC.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingKyc) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const status = kycStatus?.status || "not_submitted";

  if (status === "pending") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Identity Verification</h1>
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldQuestion className="h-16 w-16 text-warning mb-4" />
            <h2 className="text-xl font-semibold mb-2">Under Review</h2>
            <p className="text-muted-foreground">Your KYC application has been received and is currently being reviewed by our compliance team. This usually takes 1-2 business days.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Identity Verification</h1>
        <Card className="border-success bg-success/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-16 w-16 text-success mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verification Complete</h2>
            <p className="text-muted-foreground mb-4">Your identity has been successfully verified. You have full access to all platform features.</p>
            <Badge variant="outline" className="border-success text-success">Approved on {kycStatus!.decidedAt ? new Date(kycStatus!.decidedAt).toLocaleDateString() : "—"}</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identity Verification</h1>
        <p className="text-muted-foreground mt-1">Complete KYC to unlock deposits and withdrawals.</p>
      </div>

      {status === "rejected" && (
        <Card className="border-destructive bg-destructive/5 mb-6">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-4">
            <ShieldAlert className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive">Verification Rejected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Reason: {kycStatus?.rejectionReason || "Documents were unclear or invalid. Please resubmit."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submit Documents</CardTitle>
          <CardDescription>Provide your legal identity and address details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ID Type</Label>
                <Select value={idType} onValueChange={(v: any) => setIdType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="national_id">National ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
