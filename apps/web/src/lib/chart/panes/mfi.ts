import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "mfi";

export function addMfiPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = { priceLineVisible: false } as const;
  const line = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "MFI" }, paneIndex);
  const ob   = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);
  const os   = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);
  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  ob.setData(data.map((p) => ({ time: t(p.time), value: 80 })));
  os.setData(data.map((p) => ({ time: t(p.time), value: 20 })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const l = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const o = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const u = indicatorStyles.resolve(KEY, tpl.slots[2]);
    line.applyOptions({ color: toColor(l), lineWidth: l.width, lineStyle: l.style });
    ob.applyOptions({   color: toColor({ ...o, opacity: Math.min(o.opacity, 0.5) }), lineWidth: o.width, lineStyle: o.style });
    os.applyOptions({   color: toColor({ ...u, opacity: Math.min(u.opacity, 0.5) }), lineWidth: u.width, lineStyle: u.style });
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [line, ob, os], applyStyle);
}
