/**
 * Promotions page
 * ---------------
 * Lists every active promotion / activity created by the platform team.
 * The signed-in user can join a promotion with a single click; once joined
 * the card surfaces a "Joined" badge and the participant count increments.
 */
import {
  useGetPromotions,
  useJoinPromotion,
  getGetPromotionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Award,
  CheckCircle2,
  Gift,
  GraduationCap,
  Loader2,
  PiggyBank,
  Trophy,
  Users,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bonus: Gift,
  contest: Trophy,
  cashback: PiggyBank,
  education: GraduationCap,
  referral: Users,
};

export function Promotions() {
  const { data: promotions, isLoading } = useGetPromotions();
  const joinMutation = useJoinPromotion();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const join = async (id: string, title: string) => {
    try {
      await joinMutation.mutateAsync({ promotionId: id });
      await queryClient.invalidateQueries({ queryKey: getGetPromotionsQueryKey() });
      toast({ title: "You're in!", description: `Enrolled in "${title}"` });
    } catch (e: unknown) {
      toast({
        title: "Couldn't join",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Promotions &amp; activities</h1>
        <p className="text-muted-foreground text-sm">
          Earn bonuses, prizes and cashback with our ongoing campaigns.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !promotions || promotions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No promotions are running right now. Check back soon.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((p) => {
            const Icon = ICONS[p.category] ?? Award;
            const ends = new Date(p.endsAt);
            const daysLeft = Math.max(
              0,
              Math.ceil((ends.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
            );
            return (
              <Card key={p.id} className="flex flex-col" data-testid={`promo-${p.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{p.title}</CardTitle>
                        <CardDescription className="capitalize text-xs">
                          {p.category}
                        </CardDescription>
                      </div>
                    </div>
                    {p.joined && (
                      <Badge className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Joined
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Stat label="Reward" value={p.reward} />
                    <Stat label="Participants" value={p.participants.toLocaleString()} />
                    <Stat label="Ends in" value={`${daysLeft}d`} />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {format(new Date(p.startsAt), "MMM d, yyyy")} →{" "}
                    {format(ends, "MMM d, yyyy")}
                  </div>
                  <Button
                    onClick={() => join(p.id, p.title)}
                    disabled={p.joined || joinMutation.isPending}
                    data-testid={`button-join-${p.id}`}
                    className="mt-auto"
                  >
                    {joinMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {p.joined ? "Joined" : "Join now"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold truncate">{value}</div>
    </div>
  );
}
