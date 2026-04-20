import { LineSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "parabolicSar";

export function addParabolicSar(
  chart: IChartApi,
  data: Array<{ time: number; value: number }>,
): OverlayHandle {
  const series = chart.addSeries(LineSeries, {
    lineVisible: false,
    pointMarkersVisible: true,
    pointMarkersRadius: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  });

  series.setData(data.map((p) => ({ time: t(p.time), value: p.value })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const s = indicatorStyles.resolve(KEY, tpl.slots[0]);
    series.applyOptions({
      color: toColor(s),
      pointMarkersRadius: 1 + s.width,
    });
  }

  applyStyle();

  return {
    remove() { chart.removeSeries(series); },
    applyStyle,
  };
}
