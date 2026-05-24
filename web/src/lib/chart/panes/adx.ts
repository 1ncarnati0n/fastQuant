import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "adx";

export function addAdxPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; adx: number; plusDi: number; minusDi: number }>,
): PaneHandle {
  const common = { priceLineVisible: false, crosshairMarkerVisible: true } as const;

  const adx   = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "ADX" }, paneIndex);
  const plus  = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "+DI" }, paneIndex);
  const minus = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "-DI" }, paneIndex);
  const thr   = chart.addSeries(LineSeries, { priceLineVisible: false, lastValueVisible: false }, paneIndex);

  adx.setData(data.map((p)  => ({ time: t(p.time), value: p.adx })));
  plus.setData(data.map((p) => ({ time: t(p.time), value: p.plusDi })));
  minus.setData(data.map((p)=> ({ time: t(p.time), value: p.minusDi })));
  thr.setData(data.map((p)  => ({ time: t(p.time), value: 25 })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const a = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const p = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const m = indicatorStyles.resolve(KEY, tpl.slots[2]);
    const x = indicatorStyles.resolve(KEY, tpl.slots[3]);
    adx.applyOptions({   color: toColor(a), lineWidth: a.width, lineStyle: a.style });
    plus.applyOptions({  color: toColor(p), lineWidth: p.width, lineStyle: p.style });
    minus.applyOptions({ color: toColor(m), lineWidth: m.width, lineStyle: m.style });
    thr.applyOptions({   color: toColor({ ...x, opacity: Math.min(x.opacity, 0.4) }), lineWidth: x.width, lineStyle: x.style });
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [adx, plus, minus, thr], applyStyle);
}
