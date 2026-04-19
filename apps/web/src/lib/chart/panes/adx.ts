import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addAdxPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; adx: number; plusDi: number; minusDi: number }>,
): PaneHandle {
  const common = { priceLineVisible: false, crosshairMarkerVisible: true } as const;

  const adx = chart.addSeries(LineSeries, { ...common, color: "#f8fafc", lineWidth: 2, lastValueVisible: true, title: "ADX" }, paneIndex);
  const plus = chart.addSeries(LineSeries, { ...common, color: "#0bda5e", lineWidth: 1, lastValueVisible: true, title: "+DI" }, paneIndex);
  const minus = chart.addSeries(LineSeries, { ...common, color: "#fa6238", lineWidth: 1, lastValueVisible: true, title: "-DI" }, paneIndex);
  const thr = chart.addSeries(LineSeries, { color: "rgba(148,163,184,0.35)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }, paneIndex);

  adx.setData(data.map((p) => ({ time: t(p.time), value: p.adx })));
  plus.setData(data.map((p) => ({ time: t(p.time), value: p.plusDi })));
  minus.setData(data.map((p) => ({ time: t(p.time), value: p.minusDi })));
  thr.setData(data.map((p) => ({ time: t(p.time), value: 25 })));

  return makePaneHandle(chart, paneIndex, [adx, plus, minus, thr]);
}
