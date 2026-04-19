import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

export function addAtrPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const s = chart.addSeries(LineSeries, { color: "#fbbf24", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "ATR" }, paneIndex);
  s.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  return makePaneHandle(chart, paneIndex, [s]);
}
