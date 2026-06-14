/**
 * market-data
 * -----------
 * Lightweight, deterministic-ish simulator for marketing-page price feeds.
 * Real broker websites stream live quotes from a vendor; here we generate
 * jittered ticks every second so the UI feels alive without backend work.
 */
import { useEffect, useState } from "react";

export type MarketCategory = "forex" | "crypto" | "indices" | "commodities" | "stocks";

export interface MarketInstrument {
  symbol: string;
  name: string;
  category: MarketCategory;
  base: number;
  spreadPct: number;
  volatility: number;
}

export interface MarketTick extends MarketInstrument {
  bid: number;
  ask: number;
  changePct: number;
  high: number;
  low: number;
}

export const INSTRUMENTS: MarketInstrument[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", base: 1.0832, spreadPct: 0.0001, volatility: 0.0006 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", category: "forex", base: 1.2674, spreadPct: 0.00012, volatility: 0.0008 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", category: "forex", base: 151.84, spreadPct: 0.0001, volatility: 0.08 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", category: "forex", base: 0.6589, spreadPct: 0.00014, volatility: 0.0005 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", category: "forex", base: 1.3645, spreadPct: 0.00012, volatility: 0.0006 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex", base: 0.9043, spreadPct: 0.00013, volatility: 0.0005 },

  { symbol: "BTC/USD", name: "Bitcoin", category: "crypto", base: 67812, spreadPct: 0.0005, volatility: 180 },
  { symbol: "ETH/USD", name: "Ethereum", category: "crypto", base: 3284, spreadPct: 0.0005, volatility: 12 },
  { symbol: "SOL/USD", name: "Solana", category: "crypto", base: 148.6, spreadPct: 0.0006, volatility: 1.4 },
  { symbol: "XRP/USD", name: "Ripple", category: "crypto", base: 0.512, spreadPct: 0.0008, volatility: 0.008 },
  { symbol: "DOGE/USD", name: "Dogecoin", category: "crypto", base: 0.158, spreadPct: 0.001, volatility: 0.003 },

  { symbol: "US500", name: "S&P 500", category: "indices", base: 5212.4, spreadPct: 0.0002, volatility: 4 },
  { symbol: "US100", name: "Nasdaq 100", category: "indices", base: 18234.7, spreadPct: 0.0002, volatility: 18 },
  { symbol: "US30", name: "Dow Jones 30", category: "indices", base: 39482.1, spreadPct: 0.0002, volatility: 22 },
  { symbol: "GER40", name: "DAX 40", category: "indices", base: 18112.3, spreadPct: 0.0002, volatility: 14 },
  { symbol: "UK100", name: "FTSE 100", category: "indices", base: 8023.4, spreadPct: 0.0002, volatility: 6 },

  { symbol: "XAU/USD", name: "Gold", category: "commodities", base: 2392.8, spreadPct: 0.0003, volatility: 1.6 },
  { symbol: "XAG/USD", name: "Silver", category: "commodities", base: 28.46, spreadPct: 0.0004, volatility: 0.06 },
  { symbol: "WTI", name: "Crude Oil WTI", category: "commodities", base: 82.34, spreadPct: 0.0003, volatility: 0.18 },
  { symbol: "BRENT", name: "Brent Oil", category: "commodities", base: 86.92, spreadPct: 0.0003, volatility: 0.2 },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodities", base: 2.18, spreadPct: 0.0006, volatility: 0.02 },

  { symbol: "AAPL", name: "Apple Inc.", category: "stocks", base: 169.84, spreadPct: 0.0002, volatility: 0.6 },
  { symbol: "TSLA", name: "Tesla Inc.", category: "stocks", base: 168.23, spreadPct: 0.0003, volatility: 1.2 },
  { symbol: "NVDA", name: "NVIDIA Corp.", category: "stocks", base: 854.6, spreadPct: 0.0002, volatility: 4 },
  { symbol: "AMZN", name: "Amazon.com Inc.", category: "stocks", base: 184.21, spreadPct: 0.0002, volatility: 0.7 },
  { symbol: "MSFT", name: "Microsoft Corp.", category: "stocks", base: 423.18, spreadPct: 0.0002, volatility: 1.1 },
  { symbol: "GOOGL", name: "Alphabet Inc.", category: "stocks", base: 158.67, spreadPct: 0.0002, volatility: 0.5 },
];

function tickFor(inst: MarketInstrument, t: number): MarketTick {
  const drift = Math.sin(t / 9 + inst.symbol.length) * inst.volatility;
  const noise = (Math.random() - 0.5) * inst.volatility * 0.8;
  const mid = inst.base + drift + noise;
  const spread = mid * inst.spreadPct;
  const changePct = ((mid - inst.base) / inst.base) * 100;
  return {
    ...inst,
    bid: mid - spread / 2,
    ask: mid + spread / 2,
    changePct,
    high: inst.base + Math.abs(drift) + inst.volatility * 0.6,
    low: inst.base - Math.abs(drift) - inst.volatility * 0.6,
  };
}

export function useLiveMarkets(category?: MarketCategory) {
  const [ticks, setTicks] = useState<MarketTick[]>(() =>
    INSTRUMENTS.filter((i) => !category || i.category === category).map((i) => tickFor(i, 0)),
  );

  useEffect(() => {
    let t = 1;
    const id = window.setInterval(() => {
      setTicks(INSTRUMENTS.filter((i) => !category || i.category === category).map((i) => tickFor(i, t)));
      t += 1;
    }, 1200);
    return () => window.clearInterval(id);
  }, [category]);

  return ticks;
}

export function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 10) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(5);
}
