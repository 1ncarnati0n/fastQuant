import { browser } from "$app/environment";
import { defaultAnalysisParams } from "$lib/api/defaults";
import type { AnalysisParams, MarketType, SymbolSearchResult } from "$lib/api/types";
import { resolveKrStockLabel } from "$lib/utils/krStocks";

const STORAGE_KEY = "fastquant-workspace-v5";
const LEGACY_STORAGE_KEYS = ["fastquant-workspace-v4", "fastquant-workspace-v3"];
const DOCK_WIDTH_STORAGE_KEY = "fastquant-dashboard-dock-width";
const MAX_RECENT = 12;
const DEFAULT_DOCK_WIDTH = 420;
const MIN_DOCK_WIDTH = 340;
const MAX_DOCK_WIDTH = 620;

export type DockTab = "watchlist" | "indicators" | "strategy" | "fundamentals" | "settings";

export interface RecentSymbol {
  symbol: string;
  market: MarketType;
  label?: string;
}

export interface WatchlistItem {
  symbol: string;
  market: MarketType;
  label?: string;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "BTCUSDT", market: "crypto" },
  { symbol: "ETHUSDT", market: "crypto" },
  { symbol: "SPY", market: "usStock" },
  { symbol: "QQQ", market: "usStock" },
  { symbol: "AAPL", market: "usStock" },
  { symbol: "TSLA", market: "usStock" },
  { symbol: "AGQ", market: "usStock" },
  { symbol: "005930.KS", market: "krStock", label: "삼성전자" },
  { symbol: "000660.KS", market: "krStock", label: "SK하이닉스" },
  { symbol: "005380.KS", market: "krStock", label: "현대차" },
  { symbol: "000270.KS", market: "krStock", label: "기아" },
  { symbol: "373220.KS", market: "krStock", label: "LG에너지솔루션" },
  { symbol: "207940.KS", market: "krStock", label: "삼성바이오로직스" },
  { symbol: "012450.KS", market: "krStock", label: "한화에어로스페이스" },
  { symbol: "329180.KS", market: "krStock", label: "HD현대중공업" },
  { symbol: "034020.KS", market: "krStock", label: "두산에너빌리티" },
  { symbol: "402340.KS", market: "krStock", label: "SK스퀘어" },
];

export type Theme = "dark" | "light";

interface Saved {
  params: AnalysisParams;
  dockTab: DockTab;
  recentSymbols: RecentSymbol[];
  watchlist: WatchlistItem[];
  theme: Theme;
  dockOpen: boolean;
  dockWidth: number;
}

function loadSaved(): Saved {
  const fallback: Saved = {
    params: defaultAnalysisParams,
    dockTab: "watchlist",
    recentSymbols: [],
    watchlist: DEFAULT_WATCHLIST,
    theme: "light",
    dockOpen: false,
    dockWidth: DEFAULT_DOCK_WIDTH,
  };
  if (!browser) return fallback;
  try {
    const saved = readSavedPayload();
    if (!saved) return fallback;
    const parsed = saved.payload;
    const recentSymbols = Array.isArray(parsed.recentSymbols)
      ? normalizeRecentSymbols(parsed.recentSymbols as RecentSymbol[])
      : [];
    const watchlist = Array.isArray(parsed.watchlist) && parsed.watchlist.length > 0
      ? normalizeWatchlistItems(parsed.watchlist as WatchlistItem[])
      : DEFAULT_WATCHLIST;
    return {
      params: sanitizeParams(parsed.params),
      dockTab: (["watchlist", "indicators", "strategy", "fundamentals", "settings"] as DockTab[]).includes(parsed.dockTab as DockTab) ? (parsed.dockTab as DockTab) : "watchlist",
      recentSymbols,
      watchlist: saved.legacy ? mergeDefaultWatchlist(watchlist) : watchlist,
      theme: parsed.theme === "dark" ? "dark" : "light",
      dockOpen: parsed.dockOpen === true,
      dockWidth: clampDockWidth(parsed.dockWidth),
    };
  } catch {
    return fallback;
  }
}

function readSavedPayload(): { payload: Partial<Saved>; legacy: boolean } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return { payload: JSON.parse(raw) as Partial<Saved>, legacy: false };

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacyRaw = localStorage.getItem(key);
    if (legacyRaw) return { payload: JSON.parse(legacyRaw) as Partial<Saved>, legacy: true };
  }

  return null;
}

function clampDockWidth(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DOCK_WIDTH;
  return Math.max(MIN_DOCK_WIDTH, Math.min(MAX_DOCK_WIDTH, Math.round(n)));
}

function sanitizeParams(raw: unknown): AnalysisParams {
  if (!raw || typeof raw !== "object") return defaultAnalysisParams;
  const r = raw as Partial<AnalysisParams>;
  return {
    ...defaultAnalysisParams,
    ...r,
    symbol:
      typeof r.symbol === "string" && r.symbol.trim()
        ? r.symbol
        : defaultAnalysisParams.symbol,
    interval:
      typeof r.interval === "string" && r.interval.trim()
        ? r.interval
        : defaultAnalysisParams.interval,
    market: isMarket(r.market) ? r.market : defaultAnalysisParams.market,
    showBollingerBands:
      typeof r.showBollingerBands === "boolean"
        ? r.showBollingerBands
        : defaultAnalysisParams.showBollingerBands,
    showRsi:
      typeof r.showRsi === "boolean"
        ? r.showRsi
        : defaultAnalysisParams.showRsi,
    showVolume:
      typeof r.showVolume === "boolean"
        ? r.showVolume
        : defaultAnalysisParams.showVolume,
    showVolumeProfile:
      typeof r.showVolumeProfile === "boolean"
        ? r.showVolumeProfile
        : defaultAnalysisParams.showVolumeProfile,
    showVwap:
      typeof r.showVwap === "boolean"
        ? r.showVwap
        : defaultAnalysisParams.showVwap,
    showAtr:
      typeof r.showAtr === "boolean"
        ? r.showAtr
        : defaultAnalysisParams.showAtr,
    showIchimoku:
      typeof r.showIchimoku === "boolean"
        ? r.showIchimoku
        : defaultAnalysisParams.showIchimoku,
    showSupertrend:
      typeof r.showSupertrend === "boolean"
        ? r.showSupertrend
        : defaultAnalysisParams.showSupertrend,
    showParabolicSar:
      typeof r.showParabolicSar === "boolean"
        ? r.showParabolicSar
        : defaultAnalysisParams.showParabolicSar,
    smaPeriods: Array.isArray(r.smaPeriods) ? r.smaPeriods : defaultAnalysisParams.smaPeriods,
    emaPeriods: Array.isArray(r.emaPeriods) ? r.emaPeriods : defaultAnalysisParams.emaPeriods,
    signalStrategies:
      r.signalStrategies && typeof r.signalStrategies === "object"
        ? r.signalStrategies
        : defaultAnalysisParams.signalStrategies,
  };
}

function isMarket(v: unknown): v is MarketType {
  return v === "crypto" || v === "usStock" || v === "krStock" || v === "forex";
}

function normalizeRecentSymbols(items: RecentSymbol[]): RecentSymbol[] {
  const normalized: RecentSymbol[] = [];
  for (const item of items) {
    const symbol = typeof item.symbol === "string" ? item.symbol.trim().toUpperCase() : "";
    if (!symbol || !isMarket(item.market)) continue;
    const label = resolveKrStockLabel(symbol, item.market, item.label);
    normalized.push(label ? { symbol, market: item.market, label } : { symbol, market: item.market });
    if (normalized.length >= MAX_RECENT) break;
  }
  return normalized;
}

function normalizeWatchlistItems(items: WatchlistItem[]): WatchlistItem[] {
  const normalized: WatchlistItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const symbol = typeof item.symbol === "string" ? item.symbol.trim().toUpperCase() : "";
    if (!symbol || !isMarket(item.market)) continue;
    const key = `${symbol}:${item.market}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = resolveKrStockLabel(symbol, item.market, item.label);
    normalized.push(label ? { symbol, market: item.market, label } : { symbol, market: item.market });
  }
  return normalized.length > 0 ? normalized : DEFAULT_WATCHLIST;
}

function mergeDefaultWatchlist(items: WatchlistItem[]): WatchlistItem[] {
  const merged = [...items];
  const seen = new Set(merged.map((item) => `${item.symbol.toUpperCase()}:${item.market}`));
  for (const item of DEFAULT_WATCHLIST) {
    const key = `${item.symbol.toUpperCase()}:${item.market}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

function labeledSymbol(symbol: string, market: MarketType, label?: string): WatchlistItem {
  const sym = symbol.trim().toUpperCase();
  const resolvedLabel = resolveKrStockLabel(sym, market, label);
  return resolvedLabel ? { symbol: sym, market, label: resolvedLabel } : { symbol: sym, market };
}

function upsertRecent(items: RecentSymbol[], next: RecentSymbol): RecentSymbol[] {
  const n = labeledSymbol(next.symbol, next.market, next.label);
  return [
    n,
    ...items.filter(
      (i) => !(i.symbol.toUpperCase() === n.symbol && i.market === n.market),
    ),
  ].slice(0, MAX_RECENT);
}

function createWorkspace() {
  const saved = loadSaved();
  let params = $state<AnalysisParams>(saved.params);
  let dockTab = $state<DockTab>(saved.dockTab);
  let recentSymbols = $state<RecentSymbol[]>(saved.recentSymbols);
  let watchlist = $state<WatchlistItem[]>(saved.watchlist);
  let theme = $state<Theme>(saved.theme);
  let dockOpen = $state(saved.dockOpen);
  let dockWidth = $state(saved.dockWidth);

  if (browser) {
    document.documentElement.classList.toggle("dark", saved.theme === "dark");
    document.documentElement.style.colorScheme = saved.theme;
  }

  $effect.root(() => {
    $effect(() => {
      if (!browser) return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ params, dockTab, recentSymbols, watchlist, theme, dockOpen, dockWidth }),
      );
      localStorage.setItem(DOCK_WIDTH_STORAGE_KEY, String(dockWidth));
    });
  });

  return {
    get params() {
      return params;
    },
    get dockTab() {
      return dockTab;
    },
    get recentSymbols() {
      return recentSymbols;
    },
    get watchlist() {
      return watchlist;
    },
    get theme() {
      return theme;
    },
    get dockOpen() {
      return dockOpen;
    },
    get dockWidth() {
      return dockWidth;
    },
    toggleTheme() {
      theme = theme === "dark" ? "light" : "dark";
      if (browser) {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.colorScheme = theme;
      }
    },
    setDockTab(next: DockTab) {
      dockTab = next;
      dockOpen = true;
    },
    setDockOpen(next: boolean) {
      dockOpen = next;
    },
    setDockWidth(next: number) {
      dockWidth = clampDockWidth(next);
    },
    resetDockWidth() {
      dockWidth = DEFAULT_DOCK_WIDTH;
    },
    patchParams(patch: Partial<AnalysisParams>) {
      params = { ...params, ...patch };
    },
    setParams(next: AnalysisParams) {
      params = next;
    },
    selectSymbol(symbol: string, market: MarketType, label?: string) {
      params = { ...params, symbol, market };
      recentSymbols = upsertRecent(recentSymbols, labeledSymbol(symbol, market, label));
    },
    addToWatchlist(symbol: string, market: MarketType, label?: string) {
      const sym = symbol.trim().toUpperCase();
      if (watchlist.some((w) => w.symbol === sym && w.market === market)) return;
      watchlist = [...watchlist, labeledSymbol(sym, market, label)];
    },
    removeFromWatchlist(symbol: string, market: MarketType) {
      const sym = symbol.trim().toUpperCase();
      watchlist = watchlist.filter((w) => !(w.symbol === sym && w.market === market));
    },
    addSearchResult(result: SymbolSearchResult) {
      recentSymbols = upsertRecent(recentSymbols, labeledSymbol(result.symbol, result.market, result.label));
    },
    snapshot() {
      return { params, dockTab, recentSymbols };
    },
  };
}

export const workspace = createWorkspace();
