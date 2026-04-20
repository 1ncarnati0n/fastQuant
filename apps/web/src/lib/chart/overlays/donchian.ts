import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "donchian";

export function addDonchian(
  chart: IChartApi,
  data: Array<{ time: number; upper: number; middle: number; lower: number }>,
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  } as const;

  const upper  = chart.addSeries(LineSeries, { ...common });
  const middle = chart.addSeries(LineSeries, { ...common });
  const lower  = chart.addSeries(LineSeries, { ...common });

  upper.setData(data.map((p) => ({ time: t(p.time), value: p.upper })));
  middle.setData(data.map((p) => ({ time: t(p.time), value: p.middle })));
  lower.setData(data.map((p) => ({ time: t(p.time), value: p.lower })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const up = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const mi = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const lo = indicatorStyles.resolve(KEY, tpl.slots[2]);
    upper.applyOptions({ color: toColor(up), lineWidth: up.width, lineStyle: up.style });
    middle.applyOptions({ color: toColor(mi), lineWidth: mi.width, lineStyle: mi.style });
    lower.applyOptions({ color: toColor(lo), lineWidth: lo.width, lineStyle: lo.style });
  }

  applyStyle();

  return {
    remove() {
      chart.removeSeries(upper);
      chart.removeSeries(middle);
      chart.removeSeries(lower);
    },
    applyStyle,
  };
}
