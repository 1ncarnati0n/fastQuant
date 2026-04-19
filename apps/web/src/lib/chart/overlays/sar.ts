import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";

export function addParabolicSar(
  chart: IChartApi,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  const series = chart.addSeries(LineSeries, {
    color: "#f97316",
    lineWidth: 1,
    lineVisible: false,
    pointMarkersVisible: true,
    pointMarkersRadius: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  });

  series.setData(data.map((p) => ({ time: t(p.time), value: p.value })));

  return { remove() { chart.removeSeries(series); } };
}
