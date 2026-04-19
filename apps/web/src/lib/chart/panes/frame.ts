import type { IChartApi } from "lightweight-charts";
import type { OverlayHandle } from "$lib/chart/overlays/types";

export type PaneId =
  | "volume" | "rsi" | "macd" | "stoch" | "obv" | "atr"
  | "mfi" | "cmf" | "adx" | "cvd" | "stc";

/** Allocates and reclaims sub-pane indices for a single chart instance. */
export class PaneFrame {
  private nextIdx = 1;
  private slots = new Map<PaneId, number>();

  alloc(id: PaneId): number {
    const existing = this.slots.get(id);
    if (existing !== undefined) return existing;
    const idx = this.nextIdx++;
    this.slots.set(id, idx);
    return idx;
  }

  reset() {
    this.nextIdx = 1;
    this.slots.clear();
  }
}

export interface PaneHandle extends OverlayHandle {
  paneIndex: number;
}

/** Wraps a set of series as a removable pane handle. */
export function makePaneHandle(
  chart: IChartApi,
  paneIndex: number,
  series: import("lightweight-charts").ISeriesApi<import("lightweight-charts").SeriesType>[],
): PaneHandle {
  return {
    paneIndex,
    remove() {
      series.forEach((s) => chart.removeSeries(s));
    },
  };
}
