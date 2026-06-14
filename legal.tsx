/**
 * Public Legal page
 * -----------------
 * Tabbed view of terms of service, privacy policy, risk disclosure and AML
 * policy. Tab is deep-linkable via `?tab=`.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TABS = [
  { value: "terms", label: "Terms of service" },
  { value: "privacy", label: "Privacy policy" },
  { value: "risk", label: "Risk disclosure" },
  { value: "aml", label: "AML policy" },
] as const;

type TabValue = typeof TABS[number]["value"];

export function PublicLegal() {
  const search = useSearch();
  const initial = useMemo<TabValue>(() => {
    const t = new URLSearchParams(search).get("tab");
    return (TABS.find((x) => x.value === t)?.value as TabValue) ?? "terms";
  }, [search]);

  const [tab, setTab] = useState<TabValue>(initial);
  useEffect(() => setTab(initial), [initial]);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Legal & policies</h1>
      <p className="text-muted-foreground mb-6">Please read these documents carefully before using our services.</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="terms">
          <PolicyCard
            title="Terms of service"
            sections={[
              { h: "1. Acceptance", p: "By opening an account with XpressPro FX, you agree to be bound by these terms in their entirety. If you do not accept any provision, you must not use the services." },
              { h: "2. Eligibility", p: "Services are not offered to residents of restricted jurisdictions or to persons under the age of 18. You represent that you are eligible to use the services in your jurisdiction." },
              { h: "3. Account responsibilities", p: "You are responsible for maintaining the confidentiality of your credentials and all activity under your account. Notify us immediately of any unauthorized access." },
              { h: "4. Trading rules", p: "All orders are subject to our execution policy. We reserve the right to reject, cancel or modify any order to manage operational or counterparty risk." },
              { h: "5. Termination", p: "Either party may close the account at any time. Outstanding positions will be settled in accordance with the applicable contract specifications." },
            ]}
          />
        </TabsContent>

        <TabsContent value="privacy">
          <PolicyCard
            title="Privacy policy"
            sections={[
              { h: "What we collect", p: "Identity data, contact data, financial data necessary for KYC/AML compliance, and technical data such as device and usage information." },
              { h: "How we use it", p: "To open and operate your account, comply with regulatory obligations, prevent fraud, improve our services, and communicate with you about your account." },
              { h: "Sharing", p: "We share data only with regulated counterparties, payment providers and authorities where required by law. We never sell personal data." },
              { h: "Your rights", p: "You may access, rectify, delete or port your data, or object to certain processing. Contact privacy@xpressprofx.com to exercise these rights." },
              { h: "Retention", p: "We retain data for the period required by financial regulation, generally seven years after account closure." },
            ]}
          />
        </TabsContent>

        <TabsContent value="risk">
          <PolicyCard
            title="Risk disclosure"
            sections={[
              { h: "High-risk products", p: "Trading leveraged products such as CFDs, forex and cryptocurrencies carries a high level of risk. You can lose more than your initial deposit." },
              { h: "Leverage", p: "Leverage amplifies both gains and losses. Small market moves can have a large impact on your account, including the loss of all funds." },
              { h: "Crypto-specific risks", p: "Cryptocurrency markets are highly volatile, operate 24/7, and may be subject to abrupt regulatory changes. Past performance is no indication of future results." },
              { h: "Suitability", p: "These products may not be suitable for all investors. Seek independent advice if you are uncertain. Trade only with capital you can afford to lose." },
            ]}
          />
        </TabsContent>

        <TabsContent value="aml">
          <PolicyCard
            title="Anti-money-laundering policy"
            sections={[
              { h: "Customer due diligence", p: "We verify the identity of every client through documentary and electronic checks before opening an account, in line with global AML standards." },
              { h: "Ongoing monitoring", p: "Account activity is screened continuously against sanctions lists, PEP databases and behavioral risk models." },
              { h: "Reporting", p: "We are required to report suspicious activity to the relevant Financial Intelligence Unit and may freeze affected funds during investigation." },
              { h: "Source of funds", p: "Clients may be asked to evidence the origin of deposited funds. Failure to provide satisfactory documentation may result in account closure." },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PolicyCard({ title, sections }: { title: string; sections: { h: string; p: string }[] }) {
  return (
    <Card className="mt-4">
      <CardContent className="p-6 md:p-8">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-xs text-muted-foreground mb-6">Last updated April 2026</p>
        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.h}>
              <h3 className="font-semibold mb-1">{s.h}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
