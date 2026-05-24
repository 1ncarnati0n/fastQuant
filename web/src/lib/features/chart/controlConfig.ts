import type { DrawingTool } from "$lib/chart/drawing/types";
import type { ChartType, PriceScaleMode } from "$lib/stores/chart.svelte";

export const MINUTE_INTERVALS = [
  { key: "1m", label: "1분" },
  { key: "3m", label: "3분" },
  { key: "5m", label: "5분" },
  { key: "10m", label: "10분" },
  { key: "15m", label: "15분" },
  { key: "30m", label: "30분" },
  { key: "60m", label: "60분" },
  { key: "120m", label: "120분" },
  { key: "240m", label: "240분" },
];

export const PERIOD_INTERVALS = [
  { key: "1d", label: "일" },
  { key: "1w", label: "주" },
  { key: "1M", label: "월" },
  { key: "1Y", label: "년" },
];

export const CHART_TYPE_ORDER: ChartType[] = [
  "candlestick",
  "heikinAshi",
  "line",
  "area",
  "bar",
];

export const PRICE_SCALE_MODES: Array<{ key: PriceScaleMode; label: string }> = [
  { key: "normal", label: "기본" },
  { key: "log", label: "로그" },
];

export const DRAWING_TOOLS: Array<{ key: DrawingTool; label: string }> = [
  { key: "none", label: "선택" },
  { key: "horizontal", label: "수평선" },
  { key: "trend", label: "추세선" },
  { key: "fib", label: "피보나치" },
  { key: "measure", label: "측정" },
  { key: "rectangle", label: "사각형" },
  { key: "text", label: "텍스트" },
  { key: "channel", label: "채널" },
];
