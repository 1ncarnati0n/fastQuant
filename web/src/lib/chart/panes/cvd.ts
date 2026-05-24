import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "cvd";

export function addCvdPane(
  chart: IChartApi,
  paneIndex: number,
  data: Array<{ time: number; value: number }>,
): PaneHandle {
  const s = chart.addSeries(LineSeries, {
    priceLineVisible: false,
    lastValueVisible: true,
    title: "CVD",
  }, paneIndex);
  s.setData(data.map((p) => ({ time: t(p.time), value: p.value })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const st = indicatorStyles.resolve(KEY, tpl.slots[0]);
    s.applyOptions({ color: toColor(st), lineWidth: st.width, lineStyle: st.style });
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [s], applyStyle);
}
