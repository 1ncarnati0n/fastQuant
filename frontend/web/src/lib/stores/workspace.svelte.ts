import { browser } from "$app/environment";
import { defaultAnalysisParams } from "$lib/api/defaults";
import type { AnalysisParams, MarketType, SymbolSearchResult } from "$lib/api/types";

const STORAGE_KEY = "fastquant-workspace-v4";
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
  { symbol: "005930.KS", market: "krStock" },
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return {
      params: sanitizeParams(parsed.params),
      dockTab: (["watchlist", "indicators", "strategy", "fundamentals", "settings"] as DockTab[]).includes(parsed.dockTab as DockTab) ? (parsed.dockTab as DockTab) : "watchlist",
      recentSymbols: Array.isArray(parsed.recentSymbols)
        ? (parsed.recentSymbols as RecentSymbol[]).slice(0, MAX_RECENT)
        : [],
      watchlist: Array.isArray(parsed.watchlist) && parsed.watchlist.length > 0
        ? (parsed.watchlist as WatchlistItem[])
        : DEFAULT_WATCHLIST,
      theme: parsed.theme === "dark" ? "dark" : "light",
      dockOpen: parsed.dockOpen === true,
      dockWidth: clampDockWidth(parsed.dockWidth),
    };
  } catch {
    return fallback;
  }
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

function upsertRecent(items: RecentSymbol[], next: RecentSymbol): RecentSymbol[] {
  const n = { ...next, symbol: next.symbol.toUpperCase() };
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
      recentSymbols = upsertRecent(recentSymbols, { symbol, market, label });
    },
    addToWatchlist(symbol: string, market: MarketType, label?: string) {
      const sym = symbol.toUpperCase();
      if (watchlist.some((w) => w.symbol === sym && w.market === market)) return;
      watchlist = [...watchlist, { symbol: sym, market, label }];
    },
    removeFromWatchlist(symbol: string, market: MarketType) {
      const sym = symbol.toUpperCase();
      watchlist = watchlist.filter((w) => !(w.symbol === sym && w.market === market));
    },
    addSearchResult(result: SymbolSearchResult) {
      recentSymbols = upsertRecent(recentSymbols, {
        symbol: result.symbol,
        market: result.market,
        label: result.label,
      });
    },
    snapshot() {
      return { params, dockTab, recentSymbols };
    },
  };
}

export const workspace = createWorkspace();
