import { HistogramSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "volume";

type Candle = { time: number; open: number; close: number; volume: number };

export function addVolumePane(
  chart: IChartApi,
  paneIndex: number,
  candles: Candle[],
): PaneHandle {
  const s = chart.addSeries(HistogramSeries, {
    priceFormat: { type: "volume" },
    priceLineVisible: false,
    lastValueVisible: false,
    title: "VOL",
  }, paneIndex);

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const up = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const dn = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const upColor = toColor(up);
    const dnColor = toColor(dn);
    s.setData(candles.map((c) => ({
      time: t(c.time),
      value: c.volume,
      color: c.close >= c.open ? upColor : dnColor,
    })));
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [s], applyStyle);
}
