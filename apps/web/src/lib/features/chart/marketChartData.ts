import type { AnalysisResponse, Candle } from "$lib/api/types";

export interface OhlcvValue {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OhlcValue {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartPalette {
  bg: string;
  text: string;
  grid: string;
  up: string;
  down: string;
}

export function readChartPalette(): ChartPalette {
  if (typeof window === "undefined") {
    return {
      bg: "#1a2332",
      text: "#9ca3af",
      grid: "rgba(255,255,255,0.04)",
      up: "#f04452",
      down: "#4f8eff",
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    bg: value("--chart-bg", "#1a2332"),
    text: value("--chart-fore", "#9ca3af"),
    grid: value("--chart-grid", "rgba(255,255,255,0.04)"),
    up: value("--candle-up", "#f04452"),
    down: value("--candle-down", "#4f8eff"),
  };
}

export function buildOhlcvMap(candles: Candle[]): Map<number, OhlcvValue> {
  return new Map(
    candles.map((candle) => [
      candle.time,
      {
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      },
    ]),
  );
}

export function toHeikinAshi(candles: Candle[]): OhlcValue[] {
  const output: OhlcValue[] = [];

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open =
      index === 0
        ? (candle.open + candle.close) / 2
        : (output[index - 1].open + output[index - 1].close) / 2;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);

    output.push({ time: candle.time, open, high, low, close });
  }

  return output;
}

export function buildAnalysisDataKey(
  symbol: string,
  interval: string,
  analysis: AnalysisResponse | null,
): string | null {
  if (!analysis) return null;

  const firstTime = analysis.candles[0]?.time ?? 0;
  const lastTime = analysis.candles[analysis.candles.length - 1]?.time ?? 0;
  return `${symbol}:${interval}:${analysis.candles.length}:${firstTime}:${lastTime}`;
}
