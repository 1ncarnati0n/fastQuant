import { LineSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { t, type OverlayHandle } from "./types";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "ichimoku";

type IchimokuPoint = {
  time: number;
  conversion: number | null;
  base: number | null;
  spanA: number | null;
  spanB: number | null;
  lagging: number | null;
};

function nonNull(
  points: IchimokuPoint[],
  key: keyof Omit<IchimokuPoint, "time">,
): Array<{ time: number; value: number }> {
  return points
    .filter((p) => p[key] !== null)
    .map((p) => ({ time: p.time, value: p[key] as number }));
}

export function addIchimoku(
  chart: IChartApi,
  data: IchimokuPoint[],
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  } as const;

  const titles = ["Tenkan", "Kijun", "Span A", "Span B", "Lagging"];
  const seriesList: ISeriesApi<"Line">[] = titles.map((title) =>
    chart.addSeries(LineSeries, { ...common, title }),
  );

  const keys: Array<keyof Omit<IchimokuPoint, "time">> = [
    "conversion", "base", "spanA", "spanB", "lagging",
  ];

  seriesList.forEach((series, i) => {
    series.setData(nonNull(data, keys[i]).map((p) => ({ time: t(p.time), value: p.value })));
  });

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    tpl.slots.forEach((slot, i) => {
      const s = indicatorStyles.resolve(KEY, slot);
      seriesList[i].applyOptions({
        color: toColor(s),
        lineWidth: s.width,
        lineStyle: s.style,
      });
    });
  }

  applyStyle();

  return {
    remove() { seriesList.forEach((s) => chart.removeSeries(s)); },
    applyStyle,
  };
}
