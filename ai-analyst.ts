/**
 * AI Analyst routes
 *
 * Provides AI-powered market analysis, portfolio review, and trading insights
 * for the XpressPro FX platform. Uses the OpenAI-compatible client.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { getOpenAI } from "../lib/openai-client";
import { logger } from "../lib/logger";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

const ANALYST_SYSTEM_PROMPT = `You are XpressPro FX AI Analyst — a professional financial markets assistant for a regulated forex and crypto trading platform.

Your capabilities:
- Forex, crypto, stocks, indices, and commodities market analysis
- Technical analysis explanations (RSI, MACD, Bollinger Bands, support/resistance, chart patterns)
- Portfolio analysis and diversification suggestions
- Risk evaluation and position sizing guidance
- Investment strategy generation based on risk profile
- Market sentiment and news summaries

Guidelines:
- Be accurate, data-driven, and objective
- Always include appropriate risk warnings
- Use professional financial terminology but explain clearly
- Format responses using markdown for readability
- Cite that analyses are educational and not personalized financial advice
- When discussing specific assets, mention both potential upside and downside risks
- Keep responses focused and actionable (3–5 paragraphs max)

IMPORTANT DISCLAIMER: Always end responses involving specific investment suggestions with: "⚠️ This is educational content only and not personalized financial advice. Always conduct your own research and consider consulting a qualified financial advisor before making investment decisions."`;

const ChatBody = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ).optional().default([]),
  mode: z.enum(["general", "technical", "risk", "strategy", "sentiment"]).optional().default("general"),
});

const RiskCheckBody = z.object({
  asset: z.string().min(1),
  positionSize: z.number().positive().optional(),
  accountBalance: z.number().positive().optional(),
  leverage: z.number().positive().optional(),
  direction: z.enum(["long", "short"]).optional(),
});

const MarketSummaryQuery = z.object({
  assets: z.string().optional(),
});

const FALLBACK_RESPONSE = `I'm currently unable to process your request. Please try again in a moment.

For immediate assistance, you can:
- Check our **Markets** page for live price data
- Review the **Education** section for trading guides
- Contact support via the live chat widget

⚠️ This is educational content only and not personalized financial advice.`;

// POST /ai-analyst/chat — main AI chat endpoint
router.post("/ai-analyst/chat", requireAuth, async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const client = getOpenAI();
  if (!client) {
    return res.json({
      content: FALLBACK_RESPONSE,
      model: "fallback",
    });
  }

  const { message, history, mode } = parsed.data;

  const modeContext: Record<string, string> = {
    technical: "Focus on technical analysis: chart patterns, indicators, price action, and levels.",
    risk: "Focus on risk management: position sizing, stop-losses, risk/reward ratios, and capital preservation.",
    strategy: "Focus on investment strategies: entry/exit criteria, diversification, and market timing approaches.",
    sentiment: "Focus on market sentiment, news impact, and behavioral finance factors.",
    general: "",
  };

  const systemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: ANALYST_SYSTEM_PROMPT },
  ];

  if (mode !== "general" && modeContext[mode]) {
    systemMessages.push({ role: "system", content: modeContext[mode] });
  }

  try {
    const completion = await client.chat.completions.create(
      {
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          ...systemMessages,
          ...history.slice(-8).map((t) => ({ role: t.role, content: t.content })),
          { role: "user", content: message },
        ],
        max_tokens: 1024,
        stream: false,
      },
      { timeout: 25_000 },
    );

    const content = completion.choices?.[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE;
    return res.json({ content, model: completion.model });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "ai-analyst: chat failed");
    return res.json({ content: FALLBACK_RESPONSE, model: "fallback" });
  }
});

// POST /ai-analyst/chat/stream — streaming version
router.post("/ai-analyst/chat/stream", requireAuth, async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const client = getOpenAI();
  if (!client) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ content: FALLBACK_RESPONSE, done: true })}\n\n`);
    res.end();
    return;
  }

  const { message, history, mode } = parsed.data;

  const modeContext: Record<string, string> = {
    technical: "Focus on technical analysis: chart patterns, indicators, price action, and key levels.",
    risk: "Focus on risk management: position sizing, stop-losses, risk/reward ratios, and capital preservation.",
    strategy: "Focus on investment strategies: entry/exit criteria, diversification, and market timing.",
    sentiment: "Focus on market sentiment, news impact, and behavioral finance factors.",
    general: "",
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const systemMessages: Array<{ role: "system"; content: string }> = [
    { role: "system", content: ANALYST_SYSTEM_PROMPT },
  ];
  if (mode !== "general" && modeContext[mode]) {
    systemMessages.push({ role: "system", content: modeContext[mode] });
  }

  try {
    const stream = await client.chat.completions.create(
      {
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          ...systemMessages,
          ...history.slice(-8).map((t) => ({ role: t.role, content: t.content })),
          { role: "user", content: message },
        ],
        max_tokens: 1024,
        stream: true,
      },
      { timeout: 30_000 },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta, done: false })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "ai-analyst: stream failed");
    res.write(`data: ${JSON.stringify({ content: FALLBACK_RESPONSE, done: true })}\n\n`);
    res.end();
  }
});

// POST /ai-analyst/risk-check
router.post("/ai-analyst/risk-check", requireAuth, async (req, res) => {
  const parsed = RiskCheckBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const client = getOpenAI();
  const { asset, positionSize, accountBalance, leverage, direction } = parsed.data;

  const riskPrompt = [
    `Perform a risk assessment for the following trade setup:`,
    `- Asset: ${asset}`,
    direction ? `- Direction: ${direction.toUpperCase()}` : "",
    positionSize ? `- Position Size: $${positionSize}` : "",
    accountBalance ? `- Account Balance: $${accountBalance}` : "",
    leverage ? `- Leverage: ${leverage}x` : "",
    ``,
    `Provide: 1) Risk level (Low/Medium/High/Extreme), 2) Key risks to watch, 3) Recommended max position size based on 1-2% risk rule, 4) Stop-loss placement guidance.`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!client) {
    return res.json({
      content: "⚠️ AI analysis unavailable. Please use the 1-2% risk rule: never risk more than 1-2% of your account on a single trade. Always use a stop-loss.\n\n⚠️ This is educational content only and not personalized financial advice.",
      riskLevel: "unknown",
    });
  }

  try {
    const completion = await client.chat.completions.create(
      {
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: ANALYST_SYSTEM_PROMPT },
          { role: "user", content: riskPrompt },
        ],
        max_tokens: 600,
      },
      { timeout: 20_000 },
    );

    const content = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const riskLevel = /extreme/i.test(content)
      ? "extreme"
      : /high/i.test(content)
        ? "high"
        : /medium/i.test(content)
          ? "medium"
          : "low";

    return res.json({ content, riskLevel });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "ai-analyst: risk-check failed");
    return res.json({
      content: "Risk analysis temporarily unavailable. Apply standard position sizing: max 1-2% account risk per trade.\n\n⚠️ This is educational content only and not personalized financial advice.",
      riskLevel: "unknown",
    });
  }
});

// GET /ai-analyst/market-summary
router.get("/ai-analyst/market-summary", requireAuth, async (req, res) => {
  const query = MarketSummaryQuery.safeParse(req.query);
  const assets = query.data?.assets ?? "EURUSD, GBPUSD, Bitcoin, Gold, S&P 500";

  const client = getOpenAI();
  if (!client) {
    return res.json({
      content: "Market summary temporarily unavailable. Check the Markets page for live prices.",
    });
  }

  try {
    const completion = await client.chat.completions.create(
      {
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: ANALYST_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Provide a brief market overview for today covering: ${assets}. Include key levels to watch, overall sentiment (bullish/bearish/neutral), and one actionable insight per asset. Keep it concise — 2-3 sentences per asset max.`,
          },
        ],
        max_tokens: 700,
      },
      { timeout: 20_000 },
    );

    const content =
      completion.choices?.[0]?.message?.content?.trim() ??
      "Market summary unavailable.";
    return res.json({ content, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "ai-analyst: market-summary failed");
    return res.json({
      content:
        "Market summary temporarily unavailable. Please try again in a moment.",
      generatedAt: new Date().toISOString(),
    });
  }
});

export default router;
