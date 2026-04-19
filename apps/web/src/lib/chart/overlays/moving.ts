import { LineSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";

const SMA_COLORS = ["#0d9488", "#0891b2", "#0e7490", "#0369a1"];
const EMA_COLORS = ["#ea580c", "#c2410c", "#b45309", "#92400e"];
const HMA_COLORS = ["#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"];

function addMovingLines(
  chart: IChartApi,
  items: Array<{ period: number; data: Array<{ time: number; value: number }> }>,
  palette: string[],
): ISeriesApi<"Line">[] {
  return items.map((item, idx) => {
    const series = chart.addSeries(LineSeries, {
      color: palette[idx % palette.length],
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      title: `${item.period}`,
    });
    series.setData(item.data.map((p) => ({ time: t(p.time), value: p.value })));
    return series;
  });
}

export function addSma(
  chart: IChartApi,
  items: Array<{ period: number; data: Array<{ time: number; value: number }> }>,
): OverlayHandle {
  const series = addMovingLines(chart, items, SMA_COLORS);
  return { remove() { series.forEach((s) => chart.removeSeries(s)); } };
}

export function addEma(
  chart: IChartApi,
  items: Array<{ period: number; data: Array<{ time: number; value: number }> }>,
): OverlayHandle {
  const series = addMovingLines(chart, items, EMA_COLORS);
  return { remove() { series.forEach((s) => chart.removeSeries(s)); } };
}

export function addHma(
  chart: IChartApi,
  items: Array<{ period: number; data: Array<{ time: number; value: number }> }>,
): OverlayHandle {
  const series = addMovingLines(chart, items, HMA_COLORS);
  return { remove() { series.forEach((s) => chart.removeSeries(s)); } };
}
