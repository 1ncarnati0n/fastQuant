<script lang="ts">
  import { onMount, onDestroy, untrack } from "svelte";
  import type { IChartApi, ISeriesApi, LogicalRange, SeriesType } from "lightweight-charts";
  import type { AnalysisResponse, Candle } from "$lib/api/types";
  import { chart as chartStore, COMPARE_COLORS, type ChartType } from "$lib/stores/chart.svelte";
  import { addCompareOverlay } from "$lib/chart/overlays/compare";
  import { addBollinger } from "$lib/chart/overlays/bollinger";
  import { addSma, addEma, addHma } from "$lib/chart/overlays/moving";
  import { addDonchian } from "$lib/chart/overlays/donchian";
  import { addKeltner } from "$lib/chart/overlays/keltner";
  import { addParabolicSar } from "$lib/chart/overlays/sar";
  import { addSupertrend } from "$lib/chart/overlays/supertrend";
  import { addIchimoku } from "$lib/chart/overlays/ichimoku";
  import { addAutoFib } from "$lib/chart/overlays/autofib";
  import { addVwap, addAnchoredVwap } from "$lib/chart/overlays/vwap";
  import { addSignalsOverlay } from "$lib/chart/overlays/signals";
  import type { OverlayHandle } from "$lib/chart/overlays/types";
  import { PaneFrame } from "$lib/chart/panes/frame";
  import type { PaneHandle } from "$lib/chart/panes/frame";
  import { addVolumePane } from "$lib/chart/panes/volume";
  import { addRsiPane } from "$lib/chart/panes/rsi";
  import { addMacdPane } from "$lib/chart/panes/macd";
  import { addStochasticPane } from "$lib/chart/panes/stochastic";
  import { addObvPane } from "$lib/chart/panes/obv";
  import { addMfiPane } from "$lib/chart/panes/mfi";
  import { addCmfPane } from "$lib/chart/panes/cmf";
  import { addAdxPane } from "$lib/chart/panes/adx";
  import { addCvdPane } from "$lib/chart/panes/cvd";
  import { addStcPane } from "$lib/chart/panes/stc";
  import { addAtrPane } from "$lib/chart/panes/atr";
  import { chartSync } from "$lib/stores/chartSync.svelte";
  import DrawingLayer from "$lib/components/chart/DrawingLayer.svelte";
  import VolumeProfileLayer from "$lib/components/chart/VolumeProfileLayer.svelte";
  import { crosshair } from "$lib/stores/crosshair.svelte";
  import { drawing } from "$lib/stores/drawing.svelte";
  import { indicatorVisibility } from "$lib/stores/indicatorVisibility.svelte";
  import { indicatorStyles, STYLE_TEMPLATES, toColor } from "$lib/stores/indicatorStyles.svelte";
  import { workspace } from "$lib/stores/workspace.svelte";
  import {
    buildAnalysisDataKey,
    buildOhlcvMap,
    readChartPalette,
    toHeikinAshi,
    type OhlcvValue,
  } from "$lib/features/chart/marketChartData";

  type TimePoint = { time: number };
  type ValuePoint = TimePoint & { value: number };
  type PaneLegendValue = { label?: string; value: string; color?: string };
  type PaneLegendModel = { label: string; values: PaneLegendValue[] };
  type PaneLegendView = PaneLegendModel & { key: string; top: number };

  let {
    analysis = null,
    symbol = "",
    interval = "",
    compareData = {},
  }: {
    analysis?: AnalysisResponse | null;
    symbol?: string;
    interval?: string;
    compareData?: Record<string, Candle[]>;
  } = $props();

  // Load drawing context when symbol/interval changes
  $effect(() => {
    if (symbol && interval) drawing.setContext(symbol, interval);
  });

  let container: HTMLDivElement;
  let chart = $state<IChartApi | null>(null);
  let mainSeries = $state<ISeriesApi<SeriesType> | null>(null);
  let currentSeriesType = $state<ChartType | null>(null);
  let overlays: OverlayHandle[] = [];
  let compareOverlays: OverlayHandle[] = [];
  let paneHandles: PaneHandle[] = [];
  let paneLegendItems = $state<PaneLegendView[]>([]);
  let paneLegendBuilders = new Map<number, () => PaneLegendModel | null>();
  let paneLegendRenderFrame: number | null = null;
  let paneLegendRenderTimer: number | null = null;
  const paneFrame = new PaneFrame();
  let resizeObserver: ResizeObserver | null = null;
  let suppressCrosshair = false;
  let lastDataKey: string | null = null;
  const paramsKey = $derived(JSON.stringify(workspace.params));

  // Build OHLCV lookup maps for crosshair
  let ohlcvMap = new Map<number, OhlcvValue>();

  let lib: typeof import("lightweight-charts") | null = null;
  const LOWER_PANE_HEIGHT_SCALE = 0.4;
  const MIN_LOWER_PANE_HEIGHT = 72;
  const MIN_MAIN_PANE_HEIGHT = 240;

  function chartFontFamily(): string {
    if (typeof document === "undefined") return "Inter, 'Noto Sans KR', system-ui, sans-serif";
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
    return font || "Inter, 'Noto Sans KR', system-ui, sans-serif";
  }

  function pointAtTimeOrLast<T extends TimePoint>(data: T[] | null | undefined, time: number | null): T | null {
    if (!data?.length) return null;
    if (time === null) return data[data.length - 1] ?? null;
    for (let i = data.length - 1; i >= 0; i -= 1) {
      if (data[i].time <= time) return data[i];
    }
    return data[0] ?? null;
  }

  function formatIndicatorValue(value: number | null | undefined, digits = 2): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatCompactValue(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function styleSlotColor(indicatorKey: string, slotIndex = 0, fallback = "var(--chart-text)") {
    const template = STYLE_TEMPLATES[indicatorKey];
    const slot = template?.slots[slotIndex];
    return slot ? toColor(indicatorStyles.resolve(indicatorKey, slot)) : fallback;
  }

  function buildPointLegend(
    label: string,
    indicatorKey: string,
    data: ValuePoint[] | null | undefined,
    digits = 2,
    compact = false,
  ): PaneLegendModel | null {
    const point = pointAtTimeOrLast(data, crosshair.values.time);
    if (!point) return null;
    return {
      label,
      values: [{
        value: compact ? formatCompactValue(point.value) : formatIndicatorValue(point.value, digits),
        color: styleSlotColor(indicatorKey),
      }],
    };
  }

  function clearPaneLegends() {
    paneLegendItems = [];
  }

  function cancelPaneLegendRender() {
    if (typeof window === "undefined") return;
    if (paneLegendRenderFrame !== null) {
      window.cancelAnimationFrame(paneLegendRenderFrame);
      paneLegendRenderFrame = null;
    }
    if (paneLegendRenderTimer !== null) {
      window.clearTimeout(paneLegendRenderTimer);
      paneLegendRenderTimer = null;
    }
  }

  function schedulePaneLegendRender() {
    if (typeof window === "undefined") return;
    cancelPaneLegendRender();
    paneLegendRenderFrame = window.requestAnimationFrame(() => {
      paneLegendRenderFrame = null;
      renderPaneLegends();
      if (paneLegendBuilders.size > 0 && paneLegendItems.length === 0) {
        paneLegendRenderTimer = window.setTimeout(() => {
          paneLegendRenderTimer = null;
          renderPaneLegends();
        }, 60);
      }
    });
  }

  function renderPaneLegends() {
    clearPaneLegends();
    if (!chart || paneLegendBuilders.size === 0) return;

    const panes = chart.panes();
    let top = 0;
    const nextItems: PaneLegendView[] = [];

    panes.forEach((pane, paneIndex) => {
      const buildLegend = paneLegendBuilders.get(paneIndex);
      if (buildLegend) {
        const model = buildLegend();
        if (model) {
          nextItems.push({ ...model, key: String(paneIndex), top: top + 7 });
        }
      }
      top += pane.getHeight();
    });

    paneLegendItems = nextItems;
  }

  function addPaneHandle(handle: PaneHandle, buildLegend: () => PaneLegendModel | null) {
    paneHandles.push(handle);
    paneLegendBuilders.set(handle.paneIndex, buildLegend);
  }

  async function createMainSeries(type: ChartType) {
    if (!chart || !lib) return;
    suppressCrosshair = true;
    try {
      if (mainSeries) {
        chart.removeSeries(mainSeries);
        mainSeries = null;
      }
      const p = readChartPalette();
      const { CandlestickSeries, LineSeries, AreaSeries, BarSeries } = lib;
      switch (type) {
        case "line":
          mainSeries = chart.addSeries(LineSeries, {
            color: p.up,
            lineWidth: 2,
          });
          break;
        case "area":
          mainSeries = chart.addSeries(AreaSeries, {
            lineColor: p.up,
            topColor: `${p.up}55`,
            bottomColor: `${p.up}05`,
            lineWidth: 2,
          });
          break;
        case "bar":
          mainSeries = chart.addSeries(BarSeries, {
            upColor: p.up,
            downColor: p.down,
          });
          break;
        case "candlestick":
        case "heikinAshi":
        default:
          mainSeries = chart.addSeries(CandlestickSeries, {
            upColor: p.up,
            downColor: p.down,
            borderUpColor: p.up,
            borderDownColor: p.down,
            wickUpColor: p.up,
            wickDownColor: p.down,
          });
          break;
      }
      currentSeriesType = type;
    } finally {
      suppressCrosshair = false;
    }
  }

  onMount(async () => {
    lib = await import("lightweight-charts");
    const p = readChartPalette();

    chart = lib.createChart(container, {
      layout: {
        background: { color: p.bg },
        textColor: p.text,
        fontFamily: chartFontFamily(),
        panes: {
          separatorColor: p.border,
          separatorHoverColor: p.separatorHover,
        },
      },
      grid: {
        vertLines: { color: p.grid },
        horzLines: { color: p.grid },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, visible: true },
      crosshair: {
        horzLine: { labelVisible: true },
        vertLine: { labelVisible: true },
      },
    });

    await createMainSeries(chartStore.chartType);

    chartSync.register(chart);

    chart.subscribeCrosshairMove((param) => {
      if (suppressCrosshair) return;
      if (!param.time || !ohlcvMap.size) {
        crosshair.clear();
        return;
      }
      const time = param.time as number;
      const ohlcv = ohlcvMap.get(time) ?? null;
      crosshair.update({
        time,
        open: ohlcv?.open ?? null,
        high: ohlcv?.high ?? null,
        low: ohlcv?.low ?? null,
        close: ohlcv?.close ?? null,
        volume: ohlcv?.volume ?? null,
      });
    });

    resizeObserver = new ResizeObserver(([entry]) => {
      chart?.applyOptions({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });
    resizeObserver.observe(container);

    if (analysis) syncAll();
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    suppressCrosshair = true;
    overlays.forEach((o) => o.remove());
    compareOverlays.forEach((o) => o.remove());
    cancelPaneLegendRender();
    clearPaneLegends();
    paneHandles.forEach((h) => h.remove());
    chart?.remove();
    chart = null;
    chartSync.unregister();
    crosshair.clear();
  });

  $effect(() => {
    void paramsKey;
    if (analysis && mainSeries && chart) {
      untrack(() => syncAll());
    }
  });

  $effect(() => {
    void indicatorVisibility.hidden;
    if (analysis && mainSeries && chart) {
      untrack(() => syncVisibilityOnly());
    }
  });

  $effect(() => {
    void crosshair.values.time;
    if (analysis && chart && paneHandles.length > 0) {
      untrack(() => schedulePaneLegendRender());
    }
  });

  // React to chart type changes from the store
  $effect(() => {
    const desired = chartStore.chartType;
    if (!chart || !lib) return;
    if (currentSeriesType === desired) return;
    void (async () => {
      await createMainSeries(desired);
      if (analysis) syncAll();
    })();
  });

  // Price scale mode (normal/log)
  $effect(() => {
    const mode = chartStore.priceScaleMode;
    chart?.priceScale("right").applyOptions({ mode: mode === "log" ? 1 : 0 });
  });

  // Time axis visibility
  $effect(() => {
    const visible = chartStore.timeAxisVisible;
    chart?.timeScale().applyOptions({ visible });
  });

  // Theme change → re-apply palette to chart and main series
  $effect(() => {
    void workspace.theme;
    if (!chart) return;
    const p = readChartPalette();
    chart.applyOptions({
      layout: {
        background: { color: p.bg },
        textColor: p.text,
        panes: {
          separatorColor: p.border,
          separatorHoverColor: p.separatorHover,
        },
      },
      grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
    });
    if (!mainSeries || !currentSeriesType) return;
    switch (currentSeriesType) {
      case "line":
        mainSeries.applyOptions({ color: p.up });
        break;
      case "area":
        mainSeries.applyOptions({ lineColor: p.up, topColor: `${p.up}55`, bottomColor: `${p.up}05` });
        break;
      case "bar":
        mainSeries.applyOptions({ upColor: p.up, downColor: p.down });
        break;
      default:
        mainSeries.applyOptions({
          upColor: p.up, downColor: p.down,
          borderUpColor: p.up, borderDownColor: p.down,
          wickUpColor: p.up, wickDownColor: p.down,
        });
    }
  });

  function syncAll() {
    const visibleRange = getStableVisibleRange();
    const dataKey = buildAnalysisDataKey(symbol, interval, analysis);
    const dataChanged = dataKey !== lastDataKey;

    suppressCrosshair = true;
    try {
      syncCandles();
      syncOverlays();
      syncPanes();
      syncCompareOverlays();
      restoreVisibleRange(visibleRange, dataChanged);
      lastDataKey = dataKey;
    } finally {
      suppressCrosshair = false;
    }
  }

  function syncVisibilityOnly() {
    const visibleRange = getStableVisibleRange();

    suppressCrosshair = true;
    try {
      syncOverlays();
      syncPanes();
      restoreVisibleRange(visibleRange, false);
    } finally {
      suppressCrosshair = false;
    }
  }

  function getStableVisibleRange(): LogicalRange | null {
    const range = chart?.timeScale().getVisibleLogicalRange() ?? null;
    if (!range) return null;
    if (!Number.isFinite(range.from) || !Number.isFinite(range.to)) return null;
    if (range.to <= range.from) return null;
    return { from: range.from, to: range.to };
  }

  function restoreVisibleRange(range: LogicalRange | null, dataChanged: boolean) {
    if (!chart) return;
    if (dataChanged || !range) {
      chart.timeScale().fitContent();
      return;
    }

    try {
      chart.timeScale().setVisibleLogicalRange(range);
    } catch {
      chart.timeScale().fitContent();
    }
  }

  function syncPanes() {
    clearPaneLegends();
    paneLegendBuilders.clear();
    paneHandles.forEach((h) => h.remove());
    paneHandles = [];
    paneFrame.reset();
    if (!chart || !analysis) return;
    const a = analysis;

    if (workspace.params.showVolume && !isChartHidden("volume") && a.candles.length) {
      addPaneHandle(addVolumePane(chart, paneFrame.alloc("volume"), a.candles), () => {
        const candle = pointAtTimeOrLast(a.candles, crosshair.values.time);
        if (!candle) return null;
        return {
          label: "거래량",
          values: [{
            value: formatCompactValue(candle.volume),
            color: candle.close >= candle.open ? styleSlotColor("volume", 0, "#f04452") : styleSlotColor("volume", 1, "#4788ff"),
          }],
        };
      });
    }
    if (workspace.params.showRsi && !isChartHidden("rsi") && a.rsi.length) {
      addPaneHandle(addRsiPane(chart, paneFrame.alloc("rsi"), a.rsi), () => buildPointLegend("RSI", "rsi", a.rsi, 2));
    }
    if (workspace.params.macd && !isChartHidden("macd") && a.macd?.data.length) {
      addPaneHandle(addMacdPane(chart, paneFrame.alloc("macd"), a.macd.data), () => {
        const point = pointAtTimeOrLast(a.macd?.data, crosshair.values.time);
        if (!point) return null;
        return {
          label: "MACD",
          values: [
            { value: formatIndicatorValue(point.macd, 4), color: styleSlotColor("macd", 0, "#38bdf8") },
            { label: "Signal", value: formatIndicatorValue(point.signal, 4), color: styleSlotColor("macd", 1, "#fb923c") },
            {
              label: "Hist",
              value: formatIndicatorValue(point.histogram, 4),
              color: point.histogram >= 0 ? styleSlotColor("macd", 2, "#f04452") : styleSlotColor("macd", 3, "#4788ff"),
            },
          ],
        };
      });
    }
    if (workspace.params.stochastic && !isChartHidden("stochastic") && a.stochastic?.data.length) {
      addPaneHandle(addStochasticPane(chart, paneFrame.alloc("stoch"), a.stochastic.data), () => {
        const point = pointAtTimeOrLast(a.stochastic?.data, crosshair.values.time);
        if (!point) return null;
        return {
          label: "Stochastic",
          values: [
            { label: "%K", value: formatIndicatorValue(point.k, 2), color: styleSlotColor("stochastic", 0, "#34d399") },
            { label: "%D", value: formatIndicatorValue(point.d, 2), color: styleSlotColor("stochastic", 1, "#f472b6") },
          ],
        };
      });
    }
    if (workspace.params.showObv && !isChartHidden("showObv") && a.obv?.data.length) {
      addPaneHandle(addObvPane(chart, paneFrame.alloc("obv"), a.obv.data), () => buildPointLegend("OBV", "obv", a.obv?.data, 0, true));
    }
    if (workspace.params.mfi && !isChartHidden("mfi") && a.mfi?.data.length) {
      addPaneHandle(addMfiPane(chart, paneFrame.alloc("mfi"), a.mfi.data), () => buildPointLegend("MFI", "mfi", a.mfi?.data, 2));
    }
    if (workspace.params.cmf && !isChartHidden("cmf") && a.cmf?.data.length) {
      addPaneHandle(addCmfPane(chart, paneFrame.alloc("cmf"), a.cmf.data), () => buildPointLegend("CMF", "cmf", a.cmf?.data, 3));
    }
    if (workspace.params.adx && !isChartHidden("adx") && a.adx?.data.length) {
      addPaneHandle(addAdxPane(chart, paneFrame.alloc("adx"), a.adx.data), () => {
        const point = pointAtTimeOrLast(a.adx?.data, crosshair.values.time);
        if (!point) return null;
        return {
          label: "ADX",
          values: [
            { value: formatIndicatorValue(point.adx, 2), color: styleSlotColor("adx", 0, "#f8fafc") },
            { label: "+DI", value: formatIndicatorValue(point.plusDi, 2), color: styleSlotColor("adx", 1, "#f04452") },
            { label: "-DI", value: formatIndicatorValue(point.minusDi, 2), color: styleSlotColor("adx", 2, "#4788ff") },
          ],
        };
      });
    }
    if (workspace.params.showCvd && !isChartHidden("showCvd") && a.cvd?.data.length) {
      addPaneHandle(addCvdPane(chart, paneFrame.alloc("cvd"), a.cvd.data), () => buildPointLegend("CVD", "cvd", a.cvd?.data, 0, true));
    }
    if (workspace.params.stc && !isChartHidden("stc") && a.stc?.data.length) {
      addPaneHandle(addStcPane(chart, paneFrame.alloc("stc"), a.stc.data), () => buildPointLegend("STC", "stc", a.stc?.data, 2));
    }
    if (workspace.params.showAtr && !isChartHidden("atr") && a.atr?.data.length) {
      addPaneHandle(addAtrPane(chart, paneFrame.alloc("atr"), a.atr.data), () => buildPointLegend("ATR", "atr", a.atr?.data, 2));
    }

    applyCompactLowerPaneHeights();
    schedulePaneLegendRender();
  }

  function applyCompactLowerPaneHeights() {
    if (!chart || paneHandles.length === 0) return;

    const panes = chart.panes();
    const lowerPanes = paneHandles
      .map((handle) => panes[handle.paneIndex])
      .filter((pane) => pane !== undefined);

    if (lowerPanes.length === 0) return;

    const totalChartHeight = panes.reduce((sum, pane) => sum + pane.getHeight(), 0);
    const equalPaneHeight = totalChartHeight / (lowerPanes.length + 1);
    const maxLowerPaneHeight = Math.max(
      MIN_LOWER_PANE_HEIGHT,
      Math.floor((totalChartHeight - MIN_MAIN_PANE_HEIGHT) / lowerPanes.length),
    );
    const targetHeight = Math.max(
      MIN_LOWER_PANE_HEIGHT,
      Math.min(Math.round(equalPaneHeight * LOWER_PANE_HEIGHT_SCALE), maxLowerPaneHeight),
    );
    panes[0]?.setHeight(Math.max(MIN_MAIN_PANE_HEIGHT, totalChartHeight - targetHeight * lowerPanes.length));
  }

  function syncCompareOverlays() {
    compareOverlays.forEach((o) => o.remove());
    compareOverlays = [];
    if (!chart || !lib || !analysis) return;
    const baseFirstClose = analysis.candles[0]?.close ?? null;
    const { LineSeries } = lib;
    const symbols = chartStore.compareSymbols;
    symbols.forEach((sym, idx) => {
      const candles = compareData[sym];
      if (!candles || candles.length === 0) return;
      const color = COMPARE_COLORS[idx] ?? "#9ca3af";
      compareOverlays.push(addCompareOverlay(chart!, LineSeries, candles, baseFirstClose, color, sym));
    });
  }

  // Recompute compare overlays when compareData or chart.compareSymbols changes
  $effect(() => {
    void compareData;
    void chartStore.compareSymbols;
    if (chart && lib && analysis) syncCompareOverlays();
  });

  // Re-apply indicator styles without tearing down series — keeps colors/widths
  // in sync with the live style store and avoids flicker on edits.
  $effect(() => {
    void indicatorStyles.version;
    overlays.forEach((h) => h.applyStyle?.());
    paneHandles.forEach((h) => h.applyStyle?.());
    schedulePaneLegendRender();
  });

  function syncCandles() {
    if (!analysis || !mainSeries) return;
    type TS = import("lightweight-charts").UTCTimestamp;

    ohlcvMap = buildOhlcvMap(analysis.candles);

    const t = currentSeriesType ?? "candlestick";
    if (t === "line" || t === "area") {
      // Line/Area: value-based (close)
      mainSeries.setData(
        analysis.candles.map((c) => ({ time: c.time as TS, value: c.close })),
      );
    } else if (t === "heikinAshi") {
      const ha = toHeikinAshi(analysis.candles);
      mainSeries.setData(
        ha.map((c) => ({ time: c.time as TS, open: c.open, high: c.high, low: c.low, close: c.close })),
      );
    } else {
      // candlestick / bar
      mainSeries.setData(
        analysis.candles.map((c) => ({ time: c.time as TS, open: c.open, high: c.high, low: c.low, close: c.close })),
      );
    }
  }

  function syncOverlays() {
    if (!chart || !mainSeries || !analysis) return;
    overlays.forEach((o) => o.remove());
    overlays = [];
    const a = analysis;
    const hasSignalStrategy = Object.values(workspace.params.signalStrategies ?? {}).some(Boolean);
    // Some overlays expect a Candlestick-shaped series for price markers/lines.
    // Line/Area mains still accept price lines since they're attached to the chart itself.
    const anchorSeries = mainSeries as ISeriesApi<"Candlestick">;

    if (workspace.params.showBollingerBands && !isChartHidden("bb") && a.bollingerBands.length > 0) overlays.push(addBollinger(chart, a.bollingerBands));
    if (!isChartHidden("sma") && a.sma.length > 0) overlays.push(addSma(chart, a.sma));
    if (!isChartHidden("ema") && a.ema.length > 0) overlays.push(addEma(chart, a.ema));
    if (!isChartHidden("hma") && a.hma.length > 0) overlays.push(addHma(chart, a.hma));
    if (workspace.params.donchian && !isChartHidden("donchian") && a.donchian?.data.length) overlays.push(addDonchian(chart, a.donchian.data));
    if (workspace.params.keltner && !isChartHidden("keltner") && a.keltner?.data.length) overlays.push(addKeltner(chart, a.keltner.data));
    if (workspace.params.showParabolicSar && !isChartHidden("parabolicSar") && a.parabolicSar?.data.length) overlays.push(addParabolicSar(chart, a.parabolicSar.data));
    if (workspace.params.showSupertrend && !isChartHidden("supertrend") && a.supertrend?.data.length) overlays.push(addSupertrend(chart, a.supertrend.data));
    if (workspace.params.showIchimoku && !isChartHidden("ichimoku") && a.ichimoku?.data.length) overlays.push(addIchimoku(chart, a.ichimoku.data));
    if (workspace.params.showVwap && !isChartHidden("vwap") && a.vwap?.data.length) overlays.push(addVwap(chart, a.vwap.data));
    if (workspace.params.anchoredVwap && !isChartHidden("anchoredVwap") && a.anchoredVwap?.data.length) overlays.push(addAnchoredVwap(chart, a.anchoredVwap.data));
    if (workspace.params.autoFib && !isChartHidden("autoFib") && a.autoFib) overlays.push(addAutoFib(chart, a.autoFib, anchorSeries));
    if (hasSignalStrategy && a.signals.length > 0) overlays.push(addSignalsOverlay(chart, a.signals, anchorSeries));
  }

  function isChartHidden(key: string): boolean {
    return indicatorVisibility.hidden.has(key);
  }

</script>

<div class="chart-wrapper" aria-label="Market candlestick chart">
  <div bind:this={container} class="chart"></div>
  {#each paneLegendItems as item (item.key)}
    <div class="pane-legend" style:top={`${item.top}px`}>
      <span class="pane-legend__label">{item.label}</span>
      {#each item.values as value}
        {#if value.label}
          <span class="pane-legend__key">{value.label}</span>
        {/if}
        <span class="pane-legend__value" style:color={value.color}>{value.value}</span>
      {/each}
    </div>
  {/each}
  {#if workspace.params.showVolumeProfile && !indicatorVisibility.hidden.has("volumeProfile")}
    <VolumeProfileLayer {chart} series={mainSeries} candles={analysis?.candles ?? []} />
  {/if}
  <DrawingLayer {chart} series={mainSeries} />
</div>

<style>
  .chart-wrapper {
    position: relative;
    flex: 1;
    min-height: 320px;
    width: 100%;
  }

  .chart {
    width: 100%;
    height: 100%;
  }

  .pane-legend {
    position: absolute;
    left: 12px;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: calc(100% - 96px);
    min-height: 18px;
    padding: 2px 6px;
    border-radius: 5px;
    background: color-mix(in srgb, var(--surface) 72%, transparent);
    color: var(--muted-foreground);
    font-size: var(--fs-2xs);
    font-weight: 700;
    line-height: 1.2;
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    backdrop-filter: blur(4px);
  }

  .pane-legend__label {
    color: var(--foreground);
    font-weight: 800;
  }

  .pane-legend__key {
    color: var(--muted-foreground);
    font-weight: 700;
  }

  .pane-legend__value {
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }

  /* Crosshair cursor rule lives in app.css (uses :has() across child component) */

  @media (max-width: 720px) {
    .chart-wrapper {
      min-height: 280px;
    }
  }
</style>
