import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";

export function addBollinger(
  chart: IChartApi,
  data: Array<{ time: number; upper: number; middle: number; lower: number }>,
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  } as const;

  const upper = chart.addSeries(LineSeries, { ...common, color: "#7c3aed", lineWidth: 1 });
  const middle = chart.addSeries(LineSeries, { ...common, color: "#64748b", lineWidth: 1, lineStyle: 2 });
  const lower = chart.addSeries(LineSeries, { ...common, color: "#7c3aed", lineWidth: 1 });

  upper.setData(data.map((p) => ({ time: t(p.time), value: p.upper })));
  middle.setData(data.map((p) => ({ time: t(p.time), value: p.middle })));
  lower.setData(data.map((p) => ({ time: t(p.time), value: p.lower })));

  return {
    remove() {
      chart.removeSeries(upper);
      chart.removeSeries(middle);
      chart.removeSeries(lower);
    },
  };
}
