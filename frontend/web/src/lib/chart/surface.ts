import {
  createChart,
  type DeepPartial,
  type ChartOptions,
  type IChartApi,
} from "lightweight-charts";

export interface ChartSurface {
  chart: IChartApi;
  destroy: () => void;
  resize: (width: number, height: number) => void;
  fit: () => void;
}

export function createChartSurface(
  container: HTMLElement,
  options?: DeepPartial<ChartOptions>,
): ChartSurface {
  const chart = createChart(container, {
    layout: {
      background: { color: "transparent" },
      textColor: "rgb(156 163 175)",
    },
    grid: {
      vertLines: { color: "rgba(156,163,175,0.1)" },
      horzLines: { color: "rgba(156,163,175,0.1)" },
    },
    crosshair: { mode: 1 },
    rightPriceScale: { borderVisible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    ...options,
  });

  return {
    chart,
    destroy: () => chart.remove(),
    resize: (w, h) => chart.resize(w, h),
    fit: () => chart.timeScale().fitContent(),
  };
}
