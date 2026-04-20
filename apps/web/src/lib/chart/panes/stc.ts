import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "stc";

export function addStcPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = { priceLineVisible: false } as const;
  const line = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "STC" }, paneIndex);
  const hi   = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);
  const lo   = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);
  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  hi.setData(data.map((p)   => ({ time: t(p.time), value: 75 })));
  lo.setData(data.map((p)   => ({ time: t(p.time), value: 25 })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const l = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const h = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const w = indicatorStyles.resolve(KEY, tpl.slots[2]);
    line.applyOptions({ color: toColor(l), lineWidth: l.width, lineStyle: l.style });
    hi.applyOptions({   color: toColor({ ...h, opacity: Math.min(h.opacity, 0.5) }), lineWidth: h.width, lineStyle: h.style });
    lo.applyOptions({   color: toColor({ ...w, opacity: Math.min(w.opacity, 0.5) }), lineWidth: w.width, lineStyle: w.style });
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [line, hi, lo], applyStyle);
}
