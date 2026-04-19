import { HistogramSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

type Candle = { time: number; open: number; close: number; volume: number };

export function addVolumePane(
  chart: IChartApi,
  paneIndex: number,
  candles: Candle[],
): PaneHandle {
  const s = chart.addSeries(HistogramSeries, {
    priceFormat: { type: "volume" },
    priceLineVisible: false,
    lastValueVisible: false,
    title: "VOL",
  }, paneIndex);

  s.setData(candles.map((c) => ({
    time: t(c.time),
    value: c.volume,
    color: c.close >= c.open
      ? "rgba(240,68,82,0.5)"
      : "rgba(71,136,255,0.5)",
  })));

  return makePaneHandle(chart, paneIndex, [s]);
}
