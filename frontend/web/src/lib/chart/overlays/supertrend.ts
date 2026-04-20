import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "supertrend";

type STPoint = { time: number; value: number; direction: number };

export function addSupertrend(
  chart: IChartApi,
  data: STPoint[],
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  } as const;

  const bull = chart.addSeries(LineSeries, { ...common });
  const bear = chart.addSeries(LineSeries, { ...common });

  bull.setData(data.filter((p) => p.direction >= 0).map((p) => ({ time: t(p.time), value: p.value })));
  bear.setData(data.filter((p) => p.direction <  0).map((p) => ({ time: t(p.time), value: p.value })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const b = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const r = indicatorStyles.resolve(KEY, tpl.slots[1]);
    bull.applyOptions({ color: toColor(b), lineWidth: b.width, lineStyle: b.style });
    bear.applyOptions({ color: toColor(r), lineWidth: r.width, lineStyle: r.style });
  }

  applyStyle();

  return {
    remove() {
      chart.removeSeries(bull);
      chart.removeSeries(bear);
    },
    applyStyle,
  };
}
