import type { IChartApi, ISeriesApi, SeriesType, Time } from "lightweight-charts";
import type { DrawingPoint } from "./drawing/types";

export interface ChartRefs {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
}

export function pointToCoord(
  refs: ChartRefs,
  point: DrawingPoint,
): { x: number; y: number } | null {
  const x = refs.chart.timeScale().timeToCoordinate(point.time as Time);
  const y = refs.series.priceToCoordinate(point.price);
  if (x === null || y === null) return null;
  return { x, y };
}

/**
 * Converts lightweight-charts Time (UTCTimestamp | BusinessDay | string) into seconds.
 * Returns null when it can't be expressed as a timestamp.
 */
export function timeToSeconds(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
  }
  if (typeof raw === "object") {
    const bd = raw as { year?: number; month?: number; day?: number };
    if (typeof bd.year === "number" && typeof bd.month === "number" && typeof bd.day === "number") {
      return Math.floor(Date.UTC(bd.year, bd.month - 1, bd.day) / 1000);
    }
  }
  return null;
}

export function eventToPoint(
  e: MouseEvent,
  container: HTMLElement,
  refs: ChartRefs,
): DrawingPoint | null {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let rawTime = refs.chart.timeScale().coordinateToTime(x);
  const price = refs.series.coordinateToPrice(y);
  if (price === null) return null;

  // coordinateToTime returns null for pixels outside the currently-rendered data range.
  // Fall back to the nearest visible logical index so off-end clicks still snap to a bar.
  if (rawTime === null) {
    const logical = refs.chart.timeScale().coordinateToLogical(x);
    if (logical === null) return null;
    const ts = refs.chart.timeScale();
    const maybeTime = ts.logicalToCoordinate(logical) !== null ? ts.coordinateToTime(x) : null;
    rawTime = maybeTime;
    // Final fallback: walk towards the chart's time range until we hit a valid time
    if (rawTime === null) {
      const range = ts.getVisibleRange();
      if (range === null) return null;
      rawTime = range.to;
    }
  }

  const time = timeToSeconds(rawTime);
  if (time === null) return null;
  return { time, price };
}
