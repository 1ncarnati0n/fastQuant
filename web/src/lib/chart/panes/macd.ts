import { LineSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "macd";

type MacdPoint = { time: number; macd: number; signal: number; histogram: number };

export function addMacdPane(
  chart: IChartApi,
  paneIndex: number,
  data: MacdPoint[],
): PaneHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
  } as const;

  const hist = chart.addSeries(HistogramSeries, {
    priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    priceLineVisible: false,
    lastValueVisible: false,
  }, paneIndex);

  const macdLine = chart.addSeries(LineSeries, { ...common, title: "MACD" }, paneIndex);
  const sigLine  = chart.addSeries(LineSeries, { ...common, title: "Signal" }, paneIndex);

  macdLine.setData(data.map((p) => ({ time: t(p.time), value: p.macd })));
  sigLine.setData(data.map((p) => ({ time: t(p.time), value: p.signal })));

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const mc = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const sg = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const hu = indicatorStyles.resolve(KEY, tpl.slots[2]);
    const hd = indicatorStyles.resolve(KEY, tpl.slots[3]);
    macdLine.applyOptions({ color: toColor(mc), lineWidth: mc.width, lineStyle: mc.style });
    sigLine.applyOptions({  color: toColor(sg), lineWidth: sg.width, lineStyle: sg.style });

    const upColor = toColor(hu);
    const dnColor = toColor(hd);
    hist.setData(data.map((p) => ({
      time: t(p.time),
      value: p.histogram,
      color: p.histogram >= 0 ? upColor : dnColor,
    })));
  }

  applyStyle();

  return makePaneHandle(chart, paneIndex, [hist, macdLine, sigLine], applyStyle);
}
