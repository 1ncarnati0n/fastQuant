import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import type { OverlayHandle } from "./types";

export interface AutoFibData {
  highTime: number;
  highPrice: number;
  lowTime: number;
  lowPrice: number;
  isUptrend: boolean;
  levels: Array<{ ratio: number; price: number }>;
}

const FIB_COLORS: Record<string, string> = {
  "0": "#94a3b8",
  "0.236": "#fbbf24",
  "0.382": "#34d399",
  "0.5": "#60a5fa",
  "0.618": "#f472b6",
  "0.786": "#a78bfa",
  "1": "#94a3b8",
  "1.618": "#fb923c",
};

export function addAutoFib(
  chart: IChartApi,
  data: AutoFibData,
  // We need a reference series to attach price lines
  referenceSeries: ISeriesApi<SeriesType>,
): OverlayHandle {
  const priceLines = data.levels.map((level) => {
    const ratioStr = level.ratio.toString();
    const color = FIB_COLORS[ratioStr] ?? "#64748b";
    return referenceSeries.createPriceLine({
      price: level.price,
      color,
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: true,
      title: `Fib ${(level.ratio * 100).toFixed(1)}%`,
    });
  });

  return {
    remove() {
      priceLines.forEach((pl) => referenceSeries.removePriceLine(pl));
    },
  };
}
