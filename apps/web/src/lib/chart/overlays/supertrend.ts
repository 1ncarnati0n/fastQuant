import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";

type STPoint = { time: number; value: number; direction: number };

export function addSupertrend(
  chart: IChartApi,
  data: STPoint[],
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    lineWidth: 2,
  } as const;

  const bull = chart.addSeries(LineSeries, { ...common, color: "#0bda5e" });
  const bear = chart.addSeries(LineSeries, { ...common, color: "#fa6238" });

  // Split into segments: each series gets its values where active, null (gap) elsewhere.
  // lightweight-charts skips missing entries — we achieve gaps by only setting data where active.
  bull.setData(
    data
      .filter((p) => p.direction >= 0)
      .map((p) => ({ time: t(p.time), value: p.value })),
  );
  bear.setData(
    data
      .filter((p) => p.direction < 0)
      .map((p) => ({ time: t(p.time), value: p.value })),
  );

  return {
    remove() {
      chart.removeSeries(bull);
      chart.removeSeries(bear);
    },
  };
}
