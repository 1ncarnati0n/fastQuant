import { createSeriesMarkers } from "lightweight-charts";
import type { IChartApi, ISeriesApi, SeriesType, UTCTimestamp } from "lightweight-charts";
import type { OverlayHandle } from "./types";

interface SignalPoint {
  time: number;
  signalType: string;
  price: number;
  rsi: number;
  source: string;
}

function isBuy(signalType: string): boolean {
  const t = signalType.toLowerCase();
  return t.includes("bull") || t.includes("buy") || t.includes("oversold") || t.includes("long") || t.includes("up") || t.includes("cross_up");
}

export function addSignalsOverlay(
  _chart: IChartApi,
  signals: SignalPoint[],
  series: ISeriesApi<SeriesType>,
): OverlayHandle {
  const sorted = [...signals].sort((a, b) => a.time - b.time);

  const plugin = createSeriesMarkers(
    series,
    sorted.map((s) => ({
      time: s.time as UTCTimestamp,
      position: isBuy(s.signalType) ? ("belowBar" as const) : ("aboveBar" as const),
      color: isBuy(s.signalType) ? "#0bda5e" : "#fa6238",
      shape: isBuy(s.signalType) ? ("arrowUp" as const) : ("arrowDown" as const),
      size: 1,
    })),
  );

  return {
    remove() {
      plugin.detach();
    },
  };
}
