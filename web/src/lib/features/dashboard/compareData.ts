import type { Candle, MarketType } from "$lib/api/types";

export function createCompareRequestKey(
  symbol: string,
  market: MarketType,
  interval: string,
): string {
  return `${market}:${symbol}:${interval}`;
}

export function pruneCompareData(
  compareData: Record<string, Candle[]>,
  symbols: string[],
): Record<string, Candle[]> {
  const next: Record<string, Candle[]> = {};

  for (const symbol of symbols) {
    if (compareData[symbol]) next[symbol] = compareData[symbol];
  }

  return next;
}

export function haveSameCompareSymbols(
  before: Record<string, Candle[]>,
  after: Record<string, Candle[]>,
): boolean {
  return Object.keys(before).sort().join(",") === Object.keys(after).sort().join(",");
}
