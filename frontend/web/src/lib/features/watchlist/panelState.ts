import type { MarketType, WatchlistSnapshot } from "$lib/api/types";
import type { RecentSymbol, WatchlistItem } from "$lib/stores/workspace.svelte";
import {
  PRESET_CATEGORIES,
  sortSnapshots,
  type PresetCategory,
  type PresetSymbol,
  type SortMode,
} from "$lib/utils/presets";
import { resolveKrStockLabel } from "$lib/utils/krStocks";
import {
  OP_LABELS,
  matchesScreener,
  type ScreenerField,
  type ScreenerMode,
  type ScreenerRule,
} from "$lib/stores/screener.svelte";

export type FilterKey = MarketType | "all";
export type ListMode = "favorite" | "recent" | "all";

export const WATCHLIST_FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "crypto", label: "Crypto" },
  { key: "usStock", label: "US" },
  { key: "krStock", label: "KR" },
  { key: "forex", label: "FX" },
];

export const WATCHLIST_MODES: { key: ListMode; label: string }[] = [
  { key: "favorite", label: "즐겨찾기" },
  { key: "recent", label: "최근" },
  { key: "all", label: "전체" },
];

export const WATCHLIST_SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "name", label: "이름" },
  { key: "change", label: "변동률" },
  { key: "volume", label: "거래량" },
];

export interface ScreenerSnapshot {
  enabled: boolean;
  rules: ScreenerRule[];
  mode: ScreenerMode;
}

function itemKey(item: { symbol: string; market: MarketType }): string {
  return `${item.symbol}:${item.market}`;
}

function toPresetSymbol(item: WatchlistItem | RecentSymbol): PresetSymbol {
  return {
    symbol: item.symbol,
    market: item.market,
    label: resolveKrStockLabel(item.symbol, item.market, item.label) ?? item.symbol,
  };
}

export function buildWatchlistItems(
  listMode: ListMode,
  watchlist: WatchlistItem[],
  recentSymbols: RecentSymbol[],
  presetCategories: PresetCategory[] = PRESET_CATEGORIES,
): PresetSymbol[] {
  if (listMode === "favorite") return watchlist.map(toPresetSymbol);
  if (listMode === "recent") return recentSymbols.map(toPresetSymbol);

  const merged: PresetSymbol[] = [];
  const seen = new Set<string>();

  for (const item of watchlist.map(toPresetSymbol)) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  for (const category of presetCategories) {
    for (const item of category.items) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

export function filterWatchlistItems(items: PresetSymbol[], filter: FilterKey): PresetSymbol[] {
  return filter === "all" ? items : items.filter((item) => item.market === filter);
}

export function createWatchlistLabelMap(items: PresetSymbol[]): Map<string, string> {
  return new Map(items.map((item) => [itemKey(item), item.label]));
}

export function getVisibleWatchlistSnapshots(
  snapshots: WatchlistSnapshot[],
  filteredItems: PresetSymbol[],
  sortMode: SortMode,
  screener: ScreenerSnapshot,
): WatchlistSnapshot[] {
  const keep = new Set(filteredItems.map(itemKey));
  let visible = snapshots.filter((snapshot) => keep.has(itemKey(snapshot)));

  if (screener.enabled && screener.rules.length > 0) {
    visible = visible.filter((snapshot) => matchesScreener(snapshot, screener.rules, screener.mode));
  }

  return sortSnapshots(visible, sortMode);
}

export function formatScreenerRule(
  field: ScreenerField,
  op: ScreenerRule["op"],
  value: number,
): string {
  const fieldShort: Record<ScreenerField, string> = {
    changePct: "변동률",
    absChangePct: "|변동률|",
    lastPrice: "가격",
    volumeProxy: "활동성",
  };

  return `${fieldShort[field]} ${OP_LABELS[op]} ${value}`;
}

export function createSparklinePath(prices: number[], width = 60, height = 28): string {
  if (prices.length < 2) return "";

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const span = high - low || 1;

  return prices
    .map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - low) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
