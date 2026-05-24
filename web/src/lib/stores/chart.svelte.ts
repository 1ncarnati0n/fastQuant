import { browser } from "$app/environment";

export type ChartType = "candlestick" | "heikinAshi" | "line" | "area" | "bar";
export type PriceScaleMode = "normal" | "log";

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  candlestick: "캔들",
  heikinAshi: "하이킨아시",
  line: "라인",
  area: "영역",
  bar: "바",
};

const STORAGE_KEY = "fastquant-chart-v1";

const MAX_COMPARE = 2;
export const COMPARE_COLORS = ["#f59e0b", "#ec4899"] as const;

interface Saved {
  chartType: ChartType;
  priceScaleMode: PriceScaleMode;
  timeAxisVisible: boolean;
  compareSymbols: string[];
}

function isChartType(v: unknown): v is ChartType {
  return v === "candlestick" || v === "heikinAshi" || v === "line" || v === "area" || v === "bar";
}

function loadSaved(): Saved {
  const fallback: Saved = {
    chartType: "candlestick",
    priceScaleMode: "normal",
    timeAxisVisible: true,
    compareSymbols: [],
  };
  if (!browser) return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    const compares = Array.isArray(parsed.compareSymbols)
      ? parsed.compareSymbols
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.toUpperCase())
          .slice(0, MAX_COMPARE)
      : [];
    return {
      chartType: isChartType(parsed.chartType) ? parsed.chartType : fallback.chartType,
      priceScaleMode: parsed.priceScaleMode === "log" ? "log" : "normal",
      timeAxisVisible: parsed.timeAxisVisible === true,
      compareSymbols: compares,
    };
  } catch {
    return fallback;
  }
}

function createChart() {
  const saved = loadSaved();
  let chartType = $state<ChartType>(saved.chartType);
  let priceScaleMode = $state<PriceScaleMode>(saved.priceScaleMode);
  let timeAxisVisible = $state(saved.timeAxisVisible);
  let compareSymbols = $state<string[]>(saved.compareSymbols);
  let isFullscreen = $state(false);

  $effect.root(() => {
    $effect(() => {
      if (!browser) return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ chartType, priceScaleMode, timeAxisVisible, compareSymbols }),
      );
    });
  });

  return {
    get chartType() {
      return chartType;
    },
    get priceScaleMode() {
      return priceScaleMode;
    },
    get timeAxisVisible() {
      return timeAxisVisible;
    },
    get compareSymbols() {
      return compareSymbols;
    },
    get maxCompare() {
      return MAX_COMPARE;
    },
    get isFullscreen() {
      return isFullscreen;
    },
    setChartType(next: ChartType) {
      chartType = next;
    },
    setPriceScaleMode(next: PriceScaleMode) {
      priceScaleMode = next;
    },
    toggleTimeAxis() {
      timeAxisVisible = !timeAxisVisible;
    },
    addCompareSymbol(symbol: string) {
      const s = symbol.trim().toUpperCase();
      if (!s) return false;
      if (compareSymbols.includes(s)) return false;
      if (compareSymbols.length >= MAX_COMPARE) return false;
      compareSymbols = [...compareSymbols, s];
      return true;
    },
    removeCompareSymbol(symbol: string) {
      const s = symbol.trim().toUpperCase();
      compareSymbols = compareSymbols.filter((c) => c !== s);
    },
    clearCompareSymbols() {
      compareSymbols = [];
    },
    toggleFullscreen() {
      if (!browser) return;
      const doc = document;
      if (!doc.fullscreenElement) {
        doc.documentElement.requestFullscreen().catch(() => {});
        isFullscreen = true;
      } else {
        doc.exitFullscreen().catch(() => {});
        isFullscreen = false;
      }
    },
  };
}

export const chart = createChart();
