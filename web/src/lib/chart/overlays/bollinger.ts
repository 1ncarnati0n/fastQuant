import { LineSeries } from "lightweight-charts";
import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
} from "lightweight-charts";
import { t, type OverlayHandle, type TS } from "./types";
import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";

const KEY = "bb";

type BollingerPoint = { time: TS; upper: number; lower: number };

interface BandFillOptions {
  color: string;
}

interface BitmapScope {
  context: CanvasRenderingContext2D;
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
  mediaSize: { width: number; height: number };
}

interface BitmapTarget {
  useBitmapCoordinateSpace(callback: (scope: BitmapScope) => void): void;
}

class BollingerBandFillRenderer implements IPrimitivePaneRenderer {
  constructor(
    private readonly points: BollingerPoint[],
    private readonly series: ISeriesApi<"Line">,
    private readonly chart: IChartApi,
    private readonly options: BandFillOptions,
  ) {}

  draw(target: BitmapTarget): void {
    if (!this.points.length || this.options.color === "transparent") return;

    target.useBitmapCoordinateSpace(({ context, horizontalPixelRatio, verticalPixelRatio, mediaSize }) => {
      const upper: Array<{ x: number; y: number }> = [];
      const lower: Array<{ x: number; y: number }> = [];
      const pad = 40;

      for (const point of this.points) {
        const x = this.chart.timeScale().timeToCoordinate(point.time);
        const yUpper = this.series.priceToCoordinate(point.upper);
        const yLower = this.series.priceToCoordinate(point.lower);
        if (x === null || yUpper === null || yLower === null) continue;
        if (x < -pad || x > mediaSize.width + pad) continue;
        upper.push({ x, y: yUpper });
        lower.push({ x, y: yLower });
      }

      if (upper.length < 2 || lower.length < 2) return;

      context.save();
      context.fillStyle = this.options.color;
      context.beginPath();
      context.moveTo(upper[0].x * horizontalPixelRatio, upper[0].y * verticalPixelRatio);
      for (let i = 1; i < upper.length; i += 1) {
        context.lineTo(upper[i].x * horizontalPixelRatio, upper[i].y * verticalPixelRatio);
      }
      for (let i = lower.length - 1; i >= 0; i -= 1) {
        context.lineTo(lower[i].x * horizontalPixelRatio, lower[i].y * verticalPixelRatio);
      }
      context.closePath();
      context.fill();
      context.restore();
    });
  }
}

class BollingerBandFillPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Line"> | null = null;
  private requestUpdate: (() => void) | null = null;
  private readonly view: IPrimitivePaneView;

  constructor(
    private readonly points: BollingerPoint[],
    private options: BandFillOptions,
  ) {
    this.view = {
      zOrder: () => "bottom",
      renderer: () => {
        if (!this.chart || !this.series) return null;
        return new BollingerBandFillRenderer(this.points, this.series, this.chart, this.options);
      },
    };
  }

  attached(param: SeriesAttachedParameter<Time, "Line">): void {
    this.chart = param.chart as IChartApi;
    this.series = param.series;
    this.requestUpdate = param.requestUpdate;
    this.requestUpdate();
  }

  detached(): void {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this.view];
  }

  applyOptions(options: BandFillOptions): void {
    this.options = options;
    this.requestUpdate?.();
  }
}

export function addBollinger(
  chart: IChartApi,
  data: Array<{ time: number; upper: number; middle: number; lower: number }>,
): OverlayHandle {
  const common = {
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  } as const;

  const upper  = chart.addSeries(LineSeries, { ...common });
  const middle = chart.addSeries(LineSeries, { ...common });
  const lower  = chart.addSeries(LineSeries, { ...common });
  const fillData = data.map((p) => ({ time: t(p.time), upper: p.upper, lower: p.lower }));
  const fillPrimitive = new BollingerBandFillPrimitive(fillData, { color: "transparent" });

  upper.setData(data.map((p) => ({ time: t(p.time), value: p.upper })));
  middle.setData(data.map((p) => ({ time: t(p.time), value: p.middle })));
  lower.setData(data.map((p) => ({ time: t(p.time), value: p.lower })));
  upper.attachPrimitive(fillPrimitive);

  const tpl = STYLE_TEMPLATES[KEY];

  function applyStyle() {
    const up = indicatorStyles.resolve(KEY, tpl.slots[0]);
    const mi = indicatorStyles.resolve(KEY, tpl.slots[1]);
    const lo = indicatorStyles.resolve(KEY, tpl.slots[2]);
    const fill = indicatorStyles.resolve(KEY, tpl.slots[3]);
    upper.applyOptions({ color: toColor(up), lineWidth: up.width, lineStyle: up.style });
    middle.applyOptions({ color: toColor(mi), lineWidth: mi.width, lineStyle: mi.style });
    lower.applyOptions({ color: toColor(lo), lineWidth: lo.width, lineStyle: lo.style });
    fillPrimitive.applyOptions({ color: toColor(fill) });
  }

  applyStyle();

  return {
    remove() {
      upper.detachPrimitive(fillPrimitive);
      chart.removeSeries(upper);
      chart.removeSeries(middle);
      chart.removeSeries(lower);
    },
    applyStyle,
  };
}
