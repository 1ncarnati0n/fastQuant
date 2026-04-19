import { LineSeries, HistogramSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { t } from "$lib/chart/overlays/types";
import { makePaneHandle, type PaneHandle } from "./frame";

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

  const macdLine = chart.addSeries(LineSeries, { ...common, color: "#38bdf8", lineWidth: 2, title: "MACD" }, paneIndex);
  const sigLine = chart.addSeries(LineSeries, { ...common, color: "#fb923c", lineWidth: 1, title: "Signal" }, paneIndex);

  hist.setData(data.map((p) => ({
    time: t(p.time),
    value: p.histogram,
    color: p.histogram >= 0 ? "rgba(11,218,94,0.5)" : "rgba(250,98,56,0.5)",
  })));
  macdLine.setData(data.map((p) => ({ time: t(p.time), value: p.macd })));
  sigLine.setData(data.map((p) => ({ time: t(p.time), value: p.signal })));

  return makePaneHandle(chart, paneIndex, [hist, macdLine, sigLine]);
}
