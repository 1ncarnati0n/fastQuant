import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addStcPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = { priceLineVisible: false } as const;
  const line = chart.addSeries(LineSeries, { ...common, color: "#fb923c", lineWidth: 2, lastValueVisible: true, title: "STC" }, paneIndex);
  const hi = chart.addSeries(LineSeries, { ...common, color: "rgba(251,146,60,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  const lo = chart.addSeries(LineSeries, { ...common, color: "rgba(251,146,60,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  hi.setData(data.map((p) => ({ time: t(p.time), value: 75 })));
  lo.setData(data.map((p) => ({ time: t(p.time), value: 25 })));
  return makePaneHandle(chart, paneIndex, [line, hi, lo]);
}
