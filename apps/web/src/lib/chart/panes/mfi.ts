import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addMfiPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = { priceLineVisible: false } as const;
  const line = chart.addSeries(LineSeries, { ...common, color: "#818cf8", lineWidth: 2, lastValueVisible: true, title: "MFI" }, paneIndex);
  const ob = chart.addSeries(LineSeries, { ...common, color: "rgba(129,140,248,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  const os = chart.addSeries(LineSeries, { ...common, color: "rgba(129,140,248,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  ob.setData(data.map((p) => ({ time: t(p.time), value: 80 })));
  os.setData(data.map((p) => ({ time: t(p.time), value: 20 })));
  return makePaneHandle(chart, paneIndex, [line, ob, os]);
}
