import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addStochasticPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; k: number; d: number }>,
): PaneHandle {
  const common = { priceLineVisible: false, crosshairMarkerVisible: true } as const;

  const k = chart.addSeries(LineSeries, { ...common, color: "#34d399", lineWidth: 2, lastValueVisible: true, title: "K" }, paneIndex);
  const d = chart.addSeries(LineSeries, { ...common, color: "#f472b6", lineWidth: 1, lastValueVisible: true, title: "D" }, paneIndex);
  const ob = chart.addSeries(LineSeries, { ...common, color: "rgba(52,211,153,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  const os = chart.addSeries(LineSeries, { ...common, color: "rgba(52,211,153,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);

  k.setData(data.map((p) => ({ time: t(p.time), value: p.k })));
  d.setData(data.map((p) => ({ time: t(p.time), value: p.d })));
  ob.setData(data.map((p) => ({ time: t(p.time), value: 80 })));
  os.setData(data.map((p) => ({ time: t(p.time), value: 20 })));

  return makePaneHandle(chart, paneIndex, [k, d, ob, os]);
}
