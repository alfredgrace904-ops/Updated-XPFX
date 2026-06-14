import { useGetManagers, useGetSelectedManager, useSelectManager, getGetSelectedManagerQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, Target, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function Managers() {
  const { data: managers, isLoading } = useGetManagers();
  const { data: selectedManagerObj } = useGetSelectedManager();
  const selectManager = useSelectManager();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedId = selectedManagerObj?.manager?.id;

  const handleSelect = (managerId: string) => {
    selectManager.mutate({ data: { managerId } }, {
      onSuccess: () => {
        toast({ title: "Manager Selected", description: "Your social trading account is now managed by this expert." });
        queryClient.invalidateQueries({ queryKey: getGetSelectedManagerQueryKey() });
      },
      onError: () => {
        toast({ title: "Selection Failed", description: "Could not select manager.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Managers</h1>
        <p className="text-muted-foreground mt-1">Select an expert to manage your social trading portfolio</p>
      </div>

      {selectedManagerObj?.manager && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Current Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={selectedManagerObj.manager.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {selectedManagerObj.manager.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedManagerObj.manager.name}</h3>
                  <p className="text-muted-foreground">{selectedManagerObj.manager.title}</p>
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                <Link href="/messages?context=manager" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Message Manager
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-[300px] w-full" />)
        ) : (
          managers?.map(manager => (
            <Card key={manager.id} className={manager.id === selectedId ? 'border-primary shadow-md' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={manager.avatarUrl || undefined} />
                    <AvatarFallback className="bg-secondary">{manager.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {manager.id === selectedId && <Badge>Active</Badge>}
                </div>
                <CardTitle className="mt-4">{manager.name}</CardTitle>
                <CardDescription>{manager.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{manager.bio}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Trophy className="h-3 w-3" /> Win Rate</div>
                    <div className="font-bold text-success">{manager.winRate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Target className="h-3 w-3" /> APY (Est)</div>
                    <div className="font-bold text-primary">+{manager.performance}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Users className="h-3 w-3" /> Clients</div>
                    <div className="font-bold">{manager.totalClients}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Experience</div>
                    <div className="font-bold">{manager.experience} yrs</div>
                  </div>
                </div>
                <div className="pt-2">
                  <Badge variant="secondary" className="font-normal">{manager.strategy}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                {manager.id !== selectedId && (
                  <Button 
                    className="w-full" 
                    variant={manager.available ? "default" : "secondary"}
                    disabled={!manager.available || selectManager.isPending}
                    onClick={() => handleSelect(manager.id)}
                  >
                    {manager.available ? "Select Manager" : "Fully Booked"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
