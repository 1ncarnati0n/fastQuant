import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "cmf";

export function addCmfPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const common = { priceLineVisible: false } as const;
  const line = chart.addSeries(LineSeries, { ...common, lastValueVisible: true,  title: "CMF" }, paneIndex);
  const zero = chart.addSeries(LineSeries, { ...common, lastValueVisible: false }, paneIndex);
  line.setData(data.map((p) => ({ time: t(p.time), value: p.value })));
  zero.setData(data.map((p) => ({ time: t(p.time), value: 0 })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const l = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const z = indicatorStyles.resolve(KEY, tpl.slots[1]);
    line.applyOptions({ color: toColor(l), lineWidth: l.width, lineStyle: l.style });
    zero.applyOptions({ color: toColor({ ...z, opacity: Math.min(z.opacity, 0.5) }), lineWidth: z.width, lineStyle: z.style });
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [line, zero], applyStyle);
}
