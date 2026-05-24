import type { LineStyle, LineWidth } from "lightweight-charts";

export type SlotStyle = {
  color: string;
  width: LineWidth;
  style: LineStyle;
  opacity: number;
};

export type IndicatorStyleMap = Record<string, Partial<SlotStyle>>;
export type StyleStateRoot = Record<string, IndicatorStyleMap>;

export interface SlotDefinition {
  id: string;
  label: string;
  defaults: SlotStyle;
  kind?: "line" | "histogram" | "marker" | "area";
}

export interface SlotTemplate {
  /** Static slots known up-front (e.g. upper/middle/lower for Bollinger). */
  slots: SlotDefinition[];
  /** Dynamic slot factory (e.g. per-period lines for SMA). */
  dynamic?: (index: number, meta?: { period?: number }) => SlotDefinition;
  /** When true, dynamic slots are generated on demand. */
  isDynamic?: boolean;
}

// ── Presets — palettes & defaults ─────────────────────────────────
export const COLOR_PALETTE: string[] = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#64748b", "#94a3b8", "#e2e8f0", "#f8fafc",
];

export const LINE_WIDTH_OPTIONS: LineWidth[] = [1, 2, 3, 4];

export const LINE_STYLE_OPTIONS: { value: LineStyle; label: string }[] = [
  { value: 0 as LineStyle, label: "실선" },
  { value: 1 as LineStyle, label: "점" },
  { value: 2 as LineStyle, label: "대시" },
  { value: 3 as LineStyle, label: "대시-점" },
  { value: 4 as LineStyle, label: "점(듬성)" },
];

const defaultLine = (color: string, width: LineWidth = 2, style: LineStyle = 0 as LineStyle): SlotStyle => ({
  color,
  width,
  style,
  opacity: 1,
});

// Dynamic per-period palettes for multi-line indicators.
const SMA_PALETTE = ["#f59e0b", "#ec4899", "#22c55e", "#a78bfa", "#38bdf8", "#f97316"];
const EMA_PALETTE = ["#3b82f6", "#ef4444", "#10b981", "#f97316", "#a855f7", "#14b8a6"];
const HMA_PALETTE = ["#8b5cf6", "#6366f1", "#ec4899", "#f59e0b", "#06b6d4", "#22c55e"];

function makeDynamic(palette: string[]) {
  return (index: number, meta?: { period?: number }): SlotDefinition => ({
    id: String(index),
    label: meta?.period ? `${meta.period}` : `라인 ${index + 1}`,
    defaults: defaultLine(palette[index % palette.length], 2),
    kind: "line",
  });
}

export const STYLE_TEMPLATES: Record<string, SlotTemplate> = {
  bb: {
    slots: [
      { id: "upper",  label: "상단 밴드", defaults: defaultLine("#7c3aed", 1) },
      { id: "middle", label: "중심선",    defaults: defaultLine("#64748b", 1, 2 as LineStyle) },
      { id: "lower",  label: "하단 밴드", defaults: defaultLine("#7c3aed", 1) },
      { id: "fill",   label: "밴드 배경", defaults: { color: "#7c3aed", width: 1 as LineWidth, style: 0 as LineStyle, opacity: 0.12 }, kind: "area" },
    ],
  },
  sma: { slots: [], isDynamic: true, dynamic: makeDynamic(SMA_PALETTE) },
  ema: { slots: [], isDynamic: true, dynamic: makeDynamic(EMA_PALETTE) },
  hma: { slots: [], isDynamic: true, dynamic: makeDynamic(HMA_PALETTE) },
  donchian: {
    slots: [
      { id: "upper",  label: "상단", defaults: defaultLine("#0ea5e9", 1) },
      { id: "middle", label: "중심", defaults: defaultLine("#38bdf8", 1, 2 as LineStyle) },
      { id: "lower",  label: "하단", defaults: defaultLine("#0ea5e9", 1) },
    ],
  },
  keltner: {
    slots: [
      { id: "upper",  label: "상단", defaults: defaultLine("#f59e0b", 1) },
      { id: "middle", label: "중심", defaults: defaultLine("#fbbf24", 1, 2 as LineStyle) },
      { id: "lower",  label: "하단", defaults: defaultLine("#f59e0b", 1) },
    ],
  },
  vwap: {
    slots: [{ id: "line", label: "VWAP", defaults: defaultLine("#a855f7", 2) }],
  },
  anchoredVwap: {
    slots: [{ id: "line", label: "Anchored VWAP", defaults: defaultLine("#c084fc", 2) }],
  },
  parabolicSar: {
    slots: [{ id: "dots", label: "SAR 포인트", defaults: defaultLine("#f97316", 1), kind: "marker" }],
  },
  supertrend: {
    slots: [
      { id: "bull", label: "상승 구간", defaults: defaultLine("#f04452", 2) },
      { id: "bear", label: "하락 구간", defaults: defaultLine("#4788ff", 2) },
    ],
  },
  ichimoku: {
    slots: [
      { id: "conversion", label: "전환선 (Tenkan)", defaults: defaultLine("#06b6d4", 1) },
      { id: "base",       label: "기준선 (Kijun)",  defaults: defaultLine("#e879f9", 1) },
      { id: "spanA",      label: "Span A",          defaults: defaultLine("#22c55e", 2) },
      { id: "spanB",      label: "Span B",          defaults: defaultLine("#ef4444", 2) },
      { id: "lagging",    label: "후행선",          defaults: defaultLine("#94a3b8", 1, 2 as LineStyle) },
    ],
  },
  volume: {
    slots: [
      { id: "up",   label: "상승 캔들", defaults: { color: "#f04452", width: 1 as LineWidth, style: 0 as LineStyle, opacity: 0.5 }, kind: "histogram" },
      { id: "down", label: "하락 캔들", defaults: { color: "#4788ff", width: 1 as LineWidth, style: 0 as LineStyle, opacity: 0.5 }, kind: "histogram" },
    ],
  },
  rsi: {
    slots: [
      { id: "line", label: "RSI",    defaults: defaultLine("#a78bfa", 2) },
      { id: "ob",   label: "과매수 (70)", defaults: defaultLine("#a78bfa", 1, 2 as LineStyle) },
      { id: "os",   label: "과매도 (30)", defaults: defaultLine("#a78bfa", 1, 2 as LineStyle) },
    ],
  },
  macd: {
    slots: [
      { id: "macd",   label: "MACD",       defaults: defaultLine("#38bdf8", 2) },
      { id: "signal", label: "시그널",     defaults: defaultLine("#fb923c", 1) },
      { id: "histUp", label: "히스토그램(+)", defaults: { color: "#f04452", width: 1 as LineWidth, style: 0 as LineStyle, opacity: 0.5 }, kind: "histogram" },
      { id: "histDn", label: "히스토그램(-)", defaults: { color: "#4788ff", width: 1 as LineWidth, style: 0 as LineStyle, opacity: 0.5 }, kind: "histogram" },
    ],
  },
  stochastic: {
    slots: [
      { id: "k",  label: "%K",        defaults: defaultLine("#34d399", 2) },
      { id: "d",  label: "%D",        defaults: defaultLine("#f472b6", 1) },
      { id: "ob", label: "과매수 (80)", defaults: defaultLine("#34d399", 1, 2 as LineStyle) },
      { id: "os", label: "과매도 (20)", defaults: defaultLine("#34d399", 1, 2 as LineStyle) },
    ],
  },
  obv:  { slots: [{ id: "line", label: "OBV",  defaults: defaultLine("#06b6d4", 2) }] },
  mfi:  {
    slots: [
      { id: "line", label: "MFI",       defaults: defaultLine("#818cf8", 2) },
      { id: "ob",   label: "과매수 (80)", defaults: defaultLine("#818cf8", 1, 2 as LineStyle) },
      { id: "os",   label: "과매도 (20)", defaults: defaultLine("#818cf8", 1, 2 as LineStyle) },
    ],
  },
  cmf:  {
    slots: [
      { id: "line", label: "CMF",   defaults: defaultLine("#4ade80", 2) },
      { id: "zero", label: "0 기준선", defaults: defaultLine("#94a3b8", 1, 2 as LineStyle) },
    ],
  },
  adx:  {
    slots: [
      { id: "adx",    label: "ADX",   defaults: defaultLine("#f8fafc", 2) },
      { id: "plus",   label: "+DI",   defaults: defaultLine("#f04452", 1) },
      { id: "minus",  label: "-DI",   defaults: defaultLine("#4788ff", 1) },
      { id: "thresh", label: "25 기준선", defaults: defaultLine("#94a3b8", 1, 2 as LineStyle) },
    ],
  },
  cvd:  { slots: [{ id: "line", label: "CVD",  defaults: defaultLine("#22d3ee", 2) }] },
  stc:  {
    slots: [
      { id: "line", label: "STC",      defaults: defaultLine("#fb923c", 2) },
      { id: "hi",   label: "상한 (75)", defaults: defaultLine("#fb923c", 1, 2 as LineStyle) },
      { id: "lo",   label: "하한 (25)", defaults: defaultLine("#fb923c", 1, 2 as LineStyle) },
    ],
  },
  atr:  { slots: [{ id: "line", label: "ATR", defaults: defaultLine("#fbbf24", 2) }] },
};

// ── Color helpers ─────────────────────────────────────────────────
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const v = parseInt(h, 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

/** Return a color string honoring the slot opacity. */
export function toColor(slot: SlotStyle): string {
  const opacity = clamp01(slot.opacity);
  if (opacity >= 0.999) return slot.color;
  const rgb = hexToRgb(slot.color);
  if (!rgb) return slot.color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity.toFixed(3)})`;
}

// ── Store ─────────────────────────────────────────────────────────
const STORAGE_KEY = "fq.indicatorStyles.v1";

function loadFromStorage(): StyleStateRoot {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object" ? parsed : {}) as StyleStateRoot;
  } catch {
    return {};
  }
}

function persist(state: StyleStateRoot) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

function createIndicatorStylesStore() {
  let state = $state<StyleStateRoot>(loadFromStorage());
  let version = $state(0);

  function bumpPersist() {
    version += 1;
    persist(state);
  }

  function resolveSlot(
    indicatorKey: string,
    slotId: string,
    fallback: SlotStyle,
  ): SlotStyle {
    const override = state[indicatorKey]?.[slotId] ?? {};
    return {
      color:   override.color   ?? fallback.color,
      width:   (override.width   ?? fallback.width) as LineWidth,
      style:   (override.style   ?? fallback.style) as LineStyle,
      opacity: override.opacity ?? fallback.opacity,
    };
  }

  return {
    get version() { return version; },

    /** Fully resolved style for a known static slot. */
    resolve(indicatorKey: string, slot: SlotDefinition): SlotStyle {
      return resolveSlot(indicatorKey, slot.id, slot.defaults);
    },

    /** Fully resolved style for a dynamic per-index slot. */
    resolveDynamic(
      indicatorKey: string,
      index: number,
      meta?: { period?: number },
    ): SlotStyle {
      const tpl = STYLE_TEMPLATES[indicatorKey];
      const fallback = tpl?.dynamic
        ? tpl.dynamic(index, meta).defaults
        : defaultLine("#94a3b8");
      return resolveSlot(indicatorKey, String(index), fallback);
    },

    getOverride(indicatorKey: string, slotId: string): Partial<SlotStyle> {
      return state[indicatorKey]?.[slotId] ?? {};
    },

    update(
      indicatorKey: string,
      slotId: string,
      patch: Partial<SlotStyle>,
    ): void {
      const existing = state[indicatorKey] ?? {};
      const current = existing[slotId] ?? {};
      state = {
        ...state,
        [indicatorKey]: {
          ...existing,
          [slotId]: { ...current, ...patch },
        },
      };
      bumpPersist();
    },

    resetSlot(indicatorKey: string, slotId: string): void {
      const existing = state[indicatorKey];
      if (!existing || !(slotId in existing)) return;
      const { [slotId]: _dropped, ...rest } = existing;
      void _dropped;
      if (Object.keys(rest).length === 0) {
        const { [indicatorKey]: _removed, ...others } = state;
        void _removed;
        state = others as StyleStateRoot;
      } else {
        state = { ...state, [indicatorKey]: rest };
      }
      bumpPersist();
    },

    resetIndicator(indicatorKey: string): void {
      if (!(indicatorKey in state)) return;
      const { [indicatorKey]: _removed, ...rest } = state;
      void _removed;
      state = rest as StyleStateRoot;
      bumpPersist();
    },

    hasOverride(indicatorKey: string): boolean {
      const entry = state[indicatorKey];
      return !!entry && Object.keys(entry).length > 0;
    },
  };
}

export const indicatorStyles = createIndicatorStylesStore();
