/**
 * Public Investment Plans Page
 * ----------------------------
 * Marketing page describing account tiers and the services included in each.
 * Per master document rules: NO invented return percentages, performance
 * figures, or financial projections are included.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Check,
  X,
  ShieldCheck,
  Zap,
  Crown,
  ChevronRight,
  TrendingUp,
  Users,
  MessageSquare,
  BarChart2,
  HelpCircle,
  Info,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Plan data                                                                  */
/* -------------------------------------------------------------------------- */

interface Plan {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  targetAudience: string;
  badge?: string;
  features: { label: string; included: boolean }[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Standard",
    icon: ShieldCheck,
    description: "Ideal for individuals starting their trading journey and building their investment portfolio.",
    targetAudience: "New & casual traders",
    features: [
      { label: "Access to all major markets (Forex, Crypto, Indices)", included: true },
      { label: "Real-time price feeds & charts", included: true },
      { label: "Standard spreads", included: true },
      { label: "Copy Trading access", included: true },
      { label: "Crypto & bank deposit/withdrawal", included: true },
      { label: "KYC & account management", included: true },
      { label: "Email & live chat support", included: true },
      { label: "Dedicated Trade Manager", included: false },
      { label: "Priority withdrawal processing", included: false },
      { label: "VIP account manager", included: false },
    ],
    cta: "Open Standard Account",
    ctaHref: "/signup",
  },
  {
    name: "Professional",
    icon: Zap,
    description: "Enhanced access and support for active traders who require tighter execution and dedicated guidance.",
    targetAudience: "Active & experienced traders",
    badge: "Popular",
    highlighted: true,
    features: [
      { label: "Access to all major markets (Forex, Crypto, Indices)", included: true },
      { label: "Real-time price feeds & charts", included: true },
      { label: "Reduced spreads", included: true },
      { label: "Copy Trading access", included: true },
      { label: "Crypto & bank deposit/withdrawal", included: true },
      { label: "KYC & account management", included: true },
      { label: "Priority email, live chat & phone support", included: true },
      { label: "Dedicated Trade Manager", included: true },
      { label: "Priority withdrawal processing", included: true },
      { label: "VIP account manager", included: false },
    ],
    cta: "Open Professional Account",
    ctaHref: "/signup",
  },
  {
    name: "VIP",
    icon: Crown,
    description: "White-glove service with the lowest fees, premium execution, and a personal VIP account manager for high-net-worth investors.",
    targetAudience: "High-net-worth investors",
    badge: "Premium",
    features: [
      { label: "Access to all major markets (Forex, Crypto, Indices)", included: true },
      { label: "Real-time price feeds & charts", included: true },
      { label: "Lowest spreads & zero commission tiers", included: true },
      { label: "Copy Trading access", included: true },
      { label: "All deposit/withdrawal methods", included: true },
      { label: "KYC & account management", included: true },
      { label: "24/7 dedicated VIP support line", included: true },
      { label: "Dedicated Trade Manager", included: true },
      { label: "Instant withdrawal processing", included: true },
      { label: "VIP account manager", included: true },
    ],
    cta: "Apply for VIP",
    ctaHref: "/contact",
  },
];

/* -------------------------------------------------------------------------- */
/*  Additional service sections                                                */
/* -------------------------------------------------------------------------- */

const SERVICES = [
  {
    icon: BarChart2,
    title: "Managed Portfolios",
    description:
      "Assign your account to one of our verified Trade Managers and let a professional handle your active trading while you focus on your goals.",
  },
  {
    icon: Users,
    title: "Copy Trading",
    description:
      "Automatically mirror the live trades of top-performing traders on the platform. Set your copy amount and let the system do the rest.",
  },
  {
    icon: TrendingUp,
    title: "Self-Directed Trading",
    description:
      "Trade forex, crypto, indices, and commodities directly through our platform using our advanced charting tools and real-time data.",
  },
  {
    icon: MessageSquare,
    title: "AI Market Analyst",
    description:
      "Leverage our built-in AI analyst for market insights, risk analysis, and trading ideas — available 24 hours a day inside your dashboard.",
  },
];

const FAQ = [
  {
    q: "Are returns guaranteed?",
    a: "No. All trading and investment products involve risk and returns are not guaranteed. The value of your investments can go down as well as up. Please review our Risk Disclosure for full details.",
  },
  {
    q: "Can I switch account types?",
    a: "Yes. Contact our support team to discuss upgrading your account tier. Upgrades are typically processed within 1–2 business days.",
  },
  {
    q: "Is there a minimum deposit for each plan?",
    a: "Minimum deposit requirements vary by plan and region. Specific figures are displayed during the account registration process. Contact support for details before opening your account.",
  },
  {
    q: "What fees are charged?",
    a: "Our fee structure includes spreads, overnight swap rates, and in some account types, commissions. Full fee schedules are available in our Terms of Service and within the platform trading interface.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page component                                                             */
/* -------------------------------------------------------------------------- */

export function PublicInvestmentPlans() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-20">

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <Badge className="mb-4 bg-primary/10 text-primary border-0">Account Types & Plans</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Choose the right account for your goals
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Whether you're a first-time investor or a seasoned professional, we have an account tier
          designed around your trading style and experience level.
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" />
          Trading leveraged products involves substantial risk. Capital is at risk.
        </div>
      </section>

      {/* Plans Grid */}
      <section>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`flex flex-col relative ${
                  plan.highlighted
                    ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                    : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold shadow">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4 pt-8">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${plan.highlighted ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge variant="outline" className="w-fit text-xs">{plan.targetAudience}</Badge>
                  <CardDescription className="mt-2 leading-relaxed">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-2.5 text-sm">
                        {f.included ? (
                          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                        <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    asChild
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    <Link href={plan.ctaHref}>
                      {plan.cta}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Services */}
      <section>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-3">How we help you grow</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every account includes access to our full suite of trading and wealth management tools.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Common questions</h2>
          <p className="text-muted-foreground">Everything you need to know about our account plans.</p>
        </div>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-border bg-card p-5">
              <div className="flex gap-3">
                <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">{item.q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section>
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p className="font-semibold text-foreground text-sm">Important Risk Disclosure</p>
          <p>
            All financial instruments offered through XpressPro FX involve significant risk and are
            not suitable for all investors. Trading leveraged products such as forex, CFDs, and
            crypto derivatives carries a high level of risk and you may lose more than your initial
            deposit.
          </p>
          <p>
            Past performance, whether real or simulated, is not a reliable indicator of future
            results. Investment returns, profits, and performance figures shown on this page are
            illustrative only and do not constitute a promise, guarantee, or projection of future
            performance.
          </p>
          <p>
            You should carefully consider your investment objectives, level of experience, and risk
            appetite before making any financial decisions. Seek independent financial advice if
            necessary. Regulatory and licensing details — including broker registration numbers and
            compliance certifications — will be provided by the platform owner prior to launch.
          </p>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="rounded-2xl bg-primary text-primary-foreground p-10 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to get started?</h2>
        <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
          Open your account in minutes and access global markets from a single platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/contact">Talk to an advisor</Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
