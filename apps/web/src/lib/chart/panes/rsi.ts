import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addRsiPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
  } as const;

  const line = chart.addSeries(LineSeries, { ...common, color: "#a78bfa", lineWidth: 2, title: "RSI" }, paneIndex);
  const ob = chart.addSeries(LineSeries, { ...common, color: "rgba(167,139,250,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  const os = chart.addSeries(LineSeries, { ...common, color: "rgba(167,139,250,0.4)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);

  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  ob.setData(data.map((p) => ({ time: t(p.time), value: 70 })));
  os.setData(data.map((p) => ({ time: t(p.time), value: 30 })));

  return makePaneHandle(chart, paneIndex, [line, ob, os]);
}
