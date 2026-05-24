import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

function addVwapLike(
  chart: IChartApi,
  key: string,
  title: string,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  const series = chart.addSeries(LineSeries, {
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: false,
    title,
  });
  series.setData(data.map((p) => ({ time: t(p.time), value: p.value })));

  const tpl = STYLE_TEMPLATES[key];

  function applyStyle() {
    const s = indicatorStyles.resolve(key, tpl.slots[0]);
    series.applyOptions({ color: toColor(s), lineWidth: s.width, lineStyle: s.style });
  }

  applyStyle();

  return {
    remove() { chart.removeSeries(series); },
    applyStyle,
  };
}

export function addVwap(
  chart: IChartApi,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  return addVwapLike(chart, "vwap", "VWAP", data);
}

export function addAnchoredVwap(
  chart: IChartApi,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  return addVwapLike(chart, "anchoredVwap", "AVWAP", data);
}
