import type { MarketType, WatchlistSnapshot } from "$lib/api/types";
import { KR_STOCK_LEADERS } from "$lib/utils/krStocks";

export interface PresetSymbol {
  symbol: string;
  label: string;
  market: MarketType;
}

export interface PresetCategory {
  key: string;
  label: string;
  items: PresetSymbol[];
}

// Condensed version of quanting/src/utils/constants.ts PRESET_CATEGORIES.
// Not every item from the original is carried over — kept to the most liquid names
// so the "전체" tab stays scannable without infinite scroll in the MVP.
export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    key: "us-majors",
    label: "미국 대형주",
    items: [
      { symbol: "AAPL",  label: "Apple",       market: "usStock" },
      { symbol: "MSFT",  label: "Microsoft",   market: "usStock" },
      { symbol: "GOOGL", label: "Alphabet",    market: "usStock" },
      { symbol: "AMZN",  label: "Amazon",      market: "usStock" },
      { symbol: "NVDA",  label: "NVIDIA",      market: "usStock" },
      { symbol: "META",  label: "Meta",        market: "usStock" },
      { symbol: "TSLA",  label: "Tesla",       market: "usStock" },
      { symbol: "AMD",   label: "AMD",         market: "usStock" },
      { symbol: "NFLX",  label: "Netflix",     market: "usStock" },
      { symbol: "PLTR",  label: "Palantir",    market: "usStock" },
    ],
  },
  {
    key: "us-etf",
    label: "지수 / ETF",
    items: [
      { symbol: "SPY",  label: "S&P 500",       market: "usStock" },
      { symbol: "QQQ",  label: "Nasdaq 100",    market: "usStock" },
      { symbol: "IWM",  label: "Russell 2000",  market: "usStock" },
      { symbol: "DIA",  label: "Dow Jones",     market: "usStock" },
      { symbol: "VOO",  label: "Vanguard S&P",  market: "usStock" },
      { symbol: "VTI",  label: "Total Market",  market: "usStock" },
      { symbol: "ARKK", label: "ARK Innovation",market: "usStock" },
      { symbol: "XLF",  label: "Financial",     market: "usStock" },
      { symbol: "XLK",  label: "Technology",    market: "usStock" },
      { symbol: "XLE",  label: "Energy",        market: "usStock" },
    ],
  },
  {
    key: "crypto",
    label: "코인",
    items: [
      { symbol: "BTCUSDT",  label: "Bitcoin",  market: "crypto" },
      { symbol: "ETHUSDT",  label: "Ethereum", market: "crypto" },
      { symbol: "SOLUSDT",  label: "Solana",   market: "crypto" },
      { symbol: "BNBUSDT",  label: "BNB",      market: "crypto" },
      { symbol: "XRPUSDT",  label: "Ripple",   market: "crypto" },
      { symbol: "ADAUSDT",  label: "Cardano",  market: "crypto" },
      { symbol: "DOGEUSDT", label: "Dogecoin", market: "crypto" },
      { symbol: "AVAXUSDT", label: "Avalanche",market: "crypto" },
    ],
  },
  {
    key: "kr",
    label: "국내 주도주",
    items: KR_STOCK_LEADERS.map((item) => ({ ...item, market: "krStock" })),
  },
];

export const PRESET_BY_KEY = new Map(
  PRESET_CATEGORIES.flatMap((cat) =>
    cat.items.map((it) => [`${it.symbol}:${it.market}`, { ...it, category: cat.key }] as const),
  ),
);

export type SortMode = "name" | "change" | "volume";

/**
 * Returns an auto-refresh period (in ms) appropriate for the active interval.
 * Returns `null` for timeframes where polling is not worthwhile (weekly / monthly).
 */
export function intervalToRefreshMs(interval: string): number | null {
  switch (interval) {
    case "1m":  return 15_000;
    case "3m":  return 20_000;
    case "5m":  return 20_000;
    case "10m": return 30_000;
    case "15m": return 45_000;
    case "30m": return 60_000;
    case "60m":
    case "120m":
    case "240m":
    case "1h":
    case "2h":
    case "4h":  return 180_000;  // 3 min
    case "1d":  return 600_000;  // 10 min
    case "1w":
    case "1M":
    case "1Y":
    default:    return null;
  }
}

/**
 * "방금 전" / "N초 전" / "N분 전" / "HH:mm" rolling relative formatter.
 */
export function formatRelative(from: Date | null, now = new Date()): string {
  if (!from) return "대기 중";
  const deltaMs = now.getTime() - from.getTime();
  if (deltaMs < 0) return "방금 전";
  const sec = Math.floor(deltaMs / 1000);
  if (sec < 5) return "방금 전";
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) {
    return from.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return from.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function sortSnapshots(snaps: WatchlistSnapshot[], mode: SortMode): WatchlistSnapshot[] {
  const arr = [...snaps];
  switch (mode) {
    case "change":
      arr.sort((a, b) => b.changePct - a.changePct);
      break;
    case "volume":
      arr.sort((a, b) => {
        // Proxy for volume: closing price × (1 + |change%|); real volume lives on a future field.
        // For now, fall back to lastPrice when changePct is missing.
        const av = Math.abs(a.changePct) * a.lastPrice;
        const bv = Math.abs(b.changePct) * b.lastPrice;
        return bv - av;
      });
      break;
    case "name":
    default:
      arr.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
  return arr;
}
