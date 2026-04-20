import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "stochastic";

export function addStochasticPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; k: number; d: number }>,
): PaneHandle {
  const common = { priceLineVisible: false, crosshairMarkerVisible: true } as const;

  const k  = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "K" }, paneIndex);
  const d  = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "D" }, paneIndex);
  const ob = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);
  const os = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);

  k.setData(data.map((p) => ({ time: t(p.time), value: p.k })));
  d.setData(data.map((p) => ({ time: t(p.time), value: p.d })));
  ob.setData(data.map((p) => ({ time: t(p.time), value: 80 })));
  os.setData(data.map((p) => ({ time: t(p.time), value: 20 })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const sk = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const sd = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const oo = indicatorStyles.resolve(KEY, tpl.slots[2]);
    const uu = indicatorStyles.resolve(KEY, tpl.slots[3]);
    k.applyOptions({  color: toColor(sk), lineWidth: sk.width, lineStyle: sk.style });
    d.applyOptions({  color: toColor(sd), lineWidth: sd.width, lineStyle: sd.style });
    ob.applyOptions({ color: toColor({ ...oo, opacity: Math.min(oo.opacity, 0.5) }), lineWidth: oo.width, lineStyle: oo.style });
    os.applyOptions({ color: toColor({ ...uu, opacity: Math.min(uu.opacity, 0.5) }), lineWidth: uu.width, lineStyle: uu.style });
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [k, d, ob, os], applyStyle);
}
