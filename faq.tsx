/**
 * Public FAQ Page
 * ---------------
 * Accordion-style frequently asked questions grouped by topic.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { HelpCircle, MessageSquare, ChevronRight } from "lucide-react";

const FAQ_GROUPS = [
  {
    label: "General",
    color: "bg-blue-500/10 text-blue-700",
    items: [
      {
        q: "What is XpressPro FX?",
        a: "XpressPro FX is a multi-asset online trading and investment platform offering access to forex, cryptocurrency, indices, commodities, and equity markets. We provide tools for self-directed traders, copy trading, and professionally managed portfolio services.",
      },
      {
        q: "Who can open an account?",
        a: "Our platform is available to adult individuals (18+) who are residents of eligible jurisdictions. Certain restricted countries may not have access to all products. During registration you will be asked to confirm your eligibility.",
      },
      {
        q: "Is XpressPro FX regulated?",
        a: "Regulatory and licensing details are provided in our Terms of Service and will be disclosed in full by the company at launch. Please review our Legal pages or contact our compliance team for the latest regulatory status.",
      },
      {
        q: "What markets can I trade?",
        a: "You can trade Forex currency pairs, major and minor cryptocurrencies, global stock indices, commodities (gold, oil, silver), and selected individual equities — all from one unified account.",
      },
    ],
  },
  {
    label: "Account & KYC",
    color: "bg-purple-500/10 text-purple-700",
    items: [
      {
        q: "How do I open an account?",
        a: "Click 'Get started' on the homepage, fill in your details, verify your email via OTP, and complete the identity verification (KYC) process. Most accounts are reviewed within 24 hours.",
      },
      {
        q: "Why do I need to verify my identity?",
        a: "As a financial services provider we are required by anti-money laundering (AML) regulations to verify the identity of all clients. This protects you and the platform from fraud and ensures compliance with applicable laws.",
      },
      {
        q: "What documents are accepted for KYC?",
        a: "We accept government-issued photo ID (passport, national ID card, or driving licence) and a recent proof of address (utility bill or bank statement dated within the last 90 days).",
      },
      {
        q: "How long does KYC verification take?",
        a: "Most verifications are completed within 24 hours during business days. Complex cases may take longer. You will receive an in-platform notification and email once your verification is complete.",
      },
      {
        q: "Can I have multiple accounts?",
        a: "Each person may hold only one individual live account. Multiple accounts are prohibited and may result in permanent suspension. If you require a business account, please contact our support team.",
      },
    ],
  },
  {
    label: "Deposits & Withdrawals",
    color: "bg-emerald-500/10 text-emerald-700",
    items: [
      {
        q: "What deposit methods are supported?",
        a: "We support crypto transfers (including USDT, BTC, ETH, and other major tokens), bank wire transfers, and select card funding methods. Available methods vary by region and account status.",
      },
      {
        q: "How long do deposits take to process?",
        a: "Crypto deposits are credited after the required number of network confirmations (typically 10–60 minutes). Bank transfers may take 1–5 business days depending on your bank and jurisdiction.",
      },
      {
        q: "Are there deposit fees?",
        a: "XpressPro FX does not charge deposit fees. However, blockchain network fees (gas fees) and any fees charged by your bank or card provider are your responsibility.",
      },
      {
        q: "How do I withdraw funds?",
        a: "Navigate to Withdrawals in your dashboard, select your preferred withdrawal method, enter the amount, and submit. Withdrawals are processed to the same method used for deposit where possible.",
      },
      {
        q: "Why is a gas fee required for some withdrawals?",
        a: "On-chain crypto withdrawals require a small network transaction fee (gas fee) paid to the blockchain validators. This fee is not retained by XpressPro FX — it is collected to cover the cost of executing the blockchain transaction.",
      },
    ],
  },
  {
    label: "Trading",
    color: "bg-amber-500/10 text-amber-700",
    items: [
      {
        q: "What is copy trading?",
        a: "Copy trading allows you to automatically replicate the positions of verified expert traders on our platform. You set a copy amount and whenever the trader opens or closes a position, your account mirrors it proportionally.",
      },
      {
        q: "What is a Trade Manager?",
        a: "A Trade Manager is a vetted professional who manages a portion of your trading capital under our managed portfolio service. You select a manager from our marketplace and they actively trade on your behalf within agreed risk parameters.",
      },
      {
        q: "Is my capital safe with a Trade Manager?",
        a: "While Trade Managers are vetted and monitored, all trading involves risk. Your capital can decrease as well as increase. Always review a manager's historical drawdown figures and ensure you fully understand the risks before allocating capital.",
      },
      {
        q: "What is the minimum amount to start trading?",
        a: "Minimum deposit and trading amounts depend on the account type and product. Specific minimum amounts are displayed during the account opening process and on the Investment Plans page.",
      },
      {
        q: "Does the platform charge trading commissions?",
        a: "Our fee structure varies by account type and instrument. Details including spreads, commissions, and overnight swap rates are disclosed in the platform and in our Terms of Service.",
      },
    ],
  },
  {
    label: "Security",
    color: "bg-red-500/10 text-red-700",
    items: [
      {
        q: "How is my account secured?",
        a: "We use industry-standard security measures including encrypted communications (TLS), hashed password storage, session management with automatic timeout, and one-time password (OTP) verification for sensitive actions.",
      },
      {
        q: "What should I do if I suspect unauthorised access?",
        a: "Immediately change your password, contact our support team via the in-platform chat or email, and review your recent activity log. We will lock your account if necessary while we investigate.",
      },
      {
        q: "How is my personal data protected?",
        a: "All personal and financial data is encrypted at rest and in transit. We do not sell your personal data to third parties. Please read our Privacy Policy for full details on data processing.",
      },
      {
        q: "Can I enable two-factor authentication?",
        a: "Two-factor authentication via OTP (email or SMS) is required for key account actions including login, withdrawals, and KYC submissions. Additional 2FA options are available in your Security Settings.",
      },
    ],
  },
  {
    label: "Support",
    color: "bg-slate-500/10 text-slate-700",
    items: [
      {
        q: "How do I contact support?",
        a: "You can reach us via the live chat widget (bottom-right of the screen), by submitting a support ticket from your dashboard, or by emailing help@xpressprofx.com.",
      },
      {
        q: "What are support hours?",
        a: "Our support team operates 24 hours a day, 5 days a week (Monday to Friday). Emergency assistance for urgent account issues is available on weekends via email.",
      },
      {
        q: "How long does it take to get a response?",
        a: "Live chat responses are typically immediate during business hours. Support ticket responses are typically within 24 business hours. Complex financial queries may take longer.",
      },
    ],
  },
];

export function PublicFaq() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
          <HelpCircle className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Can't find what you're looking for? Our support team is available 24/5 to help you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button asChild>
            <Link href="/contact">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact support
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">
              Get started
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* FAQ Groups */}
      <div className="space-y-10">
        {FAQ_GROUPS.map((group) => (
          <section key={group.label}>
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`${group.color} border-0 px-3 py-1 text-sm font-semibold`}>
                {group.label}
              </Badge>
            </div>
            <Accordion type="multiple" className="space-y-2">
              {group.items.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`${group.label}-${idx}`}
                  className="border border-border rounded-lg px-4"
                >
                  <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
        <p className="text-muted-foreground mb-4">
          Our support team is ready to help you with anything you need.
        </p>
        <Button asChild>
          <Link href="/contact">
            <MessageSquare className="h-4 w-4 mr-2" />
            Get in touch
          </Link>
        </Button>
      </div>
    </div>
  );
}
