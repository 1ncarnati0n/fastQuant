import type { IChartApi, UTCTimestamp } from "lightweight-charts";
import type { Candle } from "$lib/api/types";
import type { OverlayHandle } from "$lib/chart/overlays/types";

type LineSeriesCtor = Parameters<IChartApi["addSeries"]>[0];

/**
 * Adds a comparison line normalized to the base series' first close,
 * so the resulting line shares the same price scale as the main series
 * and shows relative movement instead of absolute price.
 */
export function addCompareOverlay(
  chart: IChartApi,
  LineSeries: LineSeriesCtor,
  candles: Candle[],
  baseFirstClose: number | null,
  color: string,
  label: string,
): OverlayHandle {
  if (candles.length === 0 || baseFirstClose === null || !Number.isFinite(baseFirstClose)) {
    return { remove() {} };
  }
  const firstClose = candles[0]?.close;
  if (!firstClose || !Number.isFinite(firstClose)) {
    return { remove() {} };
  }
  const scale = baseFirstClose / firstClose;
  const series = chart.addSeries(LineSeries, {
    color,
    lineWidth: 2,
    lineStyle: 0,
    lastValueVisible: true,
    priceLineVisible: false,
    title: label,
  });
  series.setData(
    candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.close * scale,
    })),
  );
  return {
    remove() {
      try {
        chart.removeSeries(series);
      } catch {}
    },
  };
}
