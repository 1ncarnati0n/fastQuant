import { LineSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";

type IchimokuPoint = {
  time: number;
  conversion: number | null;
  base: number | null;
  spanA: number | null;
  spanB: number | null;
  lagging: number | null;
};

function nonNull(
  points: IchimokuPoint[],
  key: keyof Omit<IchimokuPoint, "time">,
): Array<{ time: number; value: number }> {
  return points
    .filter((p) => p[key] !== null)
    .map((p) => ({ time: p.time, value: p[key] as number }));
}

export function addIchimoku(
  chart: IChartApi,
  data: IchimokuPoint[],
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    lineWidth: 1,
  } as const;

  const seriesList: ISeriesApi<"Line">[] = [
    chart.addSeries(LineSeries, { ...common, color: "#06b6d4", title: "Tenkan" }),     // conversion
    chart.addSeries(LineSeries, { ...common, color: "#e879f9", title: "Kijun" }),      // base
    chart.addSeries(LineSeries, { ...common, color: "#22c55e", lineWidth: 2, title: "Span A" }), // spanA (cloud)
    chart.addSeries(LineSeries, { ...common, color: "#ef4444", lineWidth: 2, title: "Span B" }), // spanB (cloud)
    chart.addSeries(LineSeries, { ...common, color: "#94a3b8", lineStyle: 2, title: "Lagging" }), // lagging
  ];

  const keys: Array<keyof Omit<IchimokuPoint, "time">> = [
    "conversion", "base", "spanA", "spanB", "lagging",
  ];

  seriesList.forEach((series, i) => {
    series.setData(nonNull(data, keys[i]).map((p) => ({ time: t(p.time), value: p.value })));
  });

  return {
    remove() { seriesList.forEach((s) => chart.removeSeries(s)); },
  };
}
