import { LineSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";
import { indicatorStyles, toColor } from "$lib/stores/indicatorStyles.svelte";

type MovingItem = { period: number; data: Array<{ time: number; value: number }> };

function addMovingLines(
  chart: IChartApi,
  key: string,
  items: MovingItem[],
): OverlayHandle {
  const series: ISeriesApi<"Line">[] = items.map((item) => {
    const s = chart.addSeries(LineSeries, {
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      title: `${item.period}`,
    });
    s.setData(item.data.map((p) => ({ time: t(p.time), value: p.value })));
    return s;
  });

  function applyStyle() {
    items.forEach((item, idx) => {
      const style = indicatorStyles.resolveDynamic(key, idx, { period: item.period });
      series[idx].applyOptions({
        color: toColor(style),
        lineWidth: style.width,
        lineStyle: style.style,
      });
    });
  }

  applyStyle();

  return {
    remove() { series.forEach((s) => chart.removeSeries(s)); },
    applyStyle,
  };
}

export function addSma(chart: IChartApi, items: MovingItem[]): OverlayHandle {
  return addMovingLines(chart, "sma", items);
}

export function addEma(chart: IChartApi, items: MovingItem[]): OverlayHandle {
  return addMovingLines(chart, "ema", items);
}

export function addHma(chart: IChartApi, items: MovingItem[]): OverlayHandle {
  return addMovingLines(chart, "hma", items);
}
