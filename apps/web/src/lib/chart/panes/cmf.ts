import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addCmfPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = { priceLineVisible: false } as const;
  const line = chart.addSeries(LineSeries, { ...common, color: "#4ade80", lineWidth: 2, lastValueVisible: true, title: "CMF" }, paneIndex);
  const zero = chart.addSeries(LineSeries, { ...common, color: "rgba(148,163,184,0.35)", lineWidth: 1, lineStyle: 2, lastValueVisible: false }, paneIndex);
  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  zero.setData(data.map((p) => ({ time: t(p.time), value: 0 })));
  return makePaneHandle(chart, paneIndex, [line, zero]);
}
