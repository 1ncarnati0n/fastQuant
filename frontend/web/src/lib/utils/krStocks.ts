import type { MarketType } from "$lib/api/types";

export interface KrStockLeader {
  symbol: string;
  label: string;
}

// Local Korean labels keep 국장 UI stable when provider metadata returns English names.
export const KR_STOCK_LEADERS: KrStockLeader[] = [
  { symbol: "005930.KS", label: "삼성전자" },
  { symbol: "000660.KS", label: "SK하이닉스" },
  { symbol: "005380.KS", label: "현대차" },
  { symbol: "000270.KS", label: "기아" },
  { symbol: "373220.KS", label: "LG에너지솔루션" },
  { symbol: "207940.KS", label: "삼성바이오로직스" },
  { symbol: "012450.KS", label: "한화에어로스페이스" },
  { symbol: "329180.KS", label: "HD현대중공업" },
  { symbol: "034020.KS", label: "두산에너빌리티" },
  { symbol: "402340.KS", label: "SK스퀘어" },
  { symbol: "005490.KS", label: "POSCO홀딩스" },
  { symbol: "051910.KS", label: "LG화학" },
  { symbol: "006400.KS", label: "삼성SDI" },
  { symbol: "105560.KS", label: "KB금융" },
  { symbol: "055550.KS", label: "신한지주" },
  { symbol: "068270.KS", label: "셀트리온" },
  { symbol: "035420.KS", label: "네이버" },
  { symbol: "035720.KS", label: "카카오" },
  { symbol: "042660.KS", label: "한화오션" },
  { symbol: "010140.KS", label: "삼성중공업" },
];

export const KR_STOCK_LABELS = new Map(
  KR_STOCK_LEADERS.map((item) => [item.symbol.toUpperCase(), item.label] as const),
);

export function getKrStockLabel(symbol: string | null | undefined): string | null {
  if (!symbol) return null;
  return KR_STOCK_LABELS.get(symbol.trim().toUpperCase()) ?? null;
}

export function resolveKrStockLabel(
  symbol: string,
  market: MarketType,
  label?: string | null,
): string | undefined {
  const fallback = label?.trim() || undefined;
  if (market !== "krStock") return fallback;
  return getKrStockLabel(symbol) ?? fallback;
}
