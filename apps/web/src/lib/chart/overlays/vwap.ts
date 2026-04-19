import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";

export function addVwap(
  chart: IChartApi,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  const series = chart.addSeries(LineSeries, {
    color: "#a855f7",
    lineWidth: 2,
    lineStyle: 1,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: false,
    title: "VWAP",
  });
  series.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  return { remove() { chart.removeSeries(series); } };
}

export function addAnchoredVwap(
  chart: IChartApi,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  const series = chart.addSeries(LineSeries, {
    color: "#c084fc",
    lineWidth: 2,
    lineStyle: 1,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: false,
    title: "AVWAP",
  });
  series.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  return { remove() { chart.removeSeries(series); } };
}
