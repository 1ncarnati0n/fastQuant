import type { MarketType, WatchlistSnapshot } from "$lib/api/types";
import type { WatchlistItem } from "$lib/stores/workspace.svelte";
import {
  PRESET_BY_KEY,
  sortSnapshots,
  type PresetSymbol,
  type SortMode,
} from "$lib/utils/presets";
import { resolveKrStockLabel } from "$lib/utils/krStocks";

export type FilterKey = MarketType | "all";

export const WATCHLIST_FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "crypto", label: "Crypto" },
  { key: "usStock", label: "US" },
  { key: "krStock", label: "KR" },
  { key: "forex", label: "FX" },
];

export const WATCHLIST_SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "name", label: "이름" },
  { key: "change", label: "변동률" },
  { key: "volume", label: "거래량" },
];

function itemKey(item: { symbol: string; market: MarketType }): `${string}:${MarketType}` {
  return `${item.symbol}:${item.market}`;
}

function toPresetSymbol(item: WatchlistItem): PresetSymbol {
  const presetLabel = PRESET_BY_KEY.get(itemKey(item))?.label;
  return {
    symbol: item.symbol,
    market: item.market,
    label: resolveKrStockLabel(item.symbol, item.market, item.label) ?? presetLabel ?? item.symbol,
  };
}

export function buildWatchlistItems(watchlist: WatchlistItem[]): PresetSymbol[] {
  return watchlist.map(toPresetSymbol);
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
): WatchlistSnapshot[] {
  const keep = new Set(filteredItems.map(itemKey));
  const visible = snapshots.filter((snapshot) => keep.has(itemKey(snapshot)));
  return sortSnapshots(visible, sortMode);
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
