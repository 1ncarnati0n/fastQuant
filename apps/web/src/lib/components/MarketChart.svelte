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
  import { workspace } from "$lib/stores/workspace.svelte";
  import {
    buildAnalysisDataKey,
    buildOhlcvMap,
    readChartPalette,
    toHeikinAshi,
    type OhlcvValue,
  } from "$lib/features/chart/marketChartData";

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
  const paneFrame = new PaneFrame();
  let resizeObserver: ResizeObserver | null = null;
  let suppressCrosshair = false;
  let lastDataKey: string | null = null;
  const paramsKey = $derived(JSON.stringify(workspace.params));

  // Build OHLCV lookup maps for crosshair
  let ohlcvMap = new Map<number, OhlcvValue>();

  let lib: typeof import("lightweight-charts") | null = null;

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
        fontFamily: "Inter, 'Noto Sans KR', system-ui, sans-serif",
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
      layout: { background: { color: p.bg }, textColor: p.text },
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
    paneHandles.forEach((h) => h.remove());
    paneHandles = [];
    paneFrame.reset();
    if (!chart || !analysis) return;

    if (workspace.params.showVolume && !isChartHidden("volume") && analysis.candles.length)
      paneHandles.push(addVolumePane(chart, paneFrame.alloc("volume"), analysis.candles));
    if (workspace.params.showRsi && !isChartHidden("rsi") && analysis.rsi.length)
      paneHandles.push(addRsiPane(chart, paneFrame.alloc("rsi"), analysis.rsi));
    if (workspace.params.macd && !isChartHidden("macd") && analysis.macd?.data.length)
      paneHandles.push(addMacdPane(chart, paneFrame.alloc("macd"), analysis.macd.data));
    if (workspace.params.stochastic && !isChartHidden("stochastic") && analysis.stochastic?.data.length)
      paneHandles.push(addStochasticPane(chart, paneFrame.alloc("stoch"), analysis.stochastic.data));
    if (workspace.params.showObv && !isChartHidden("showObv") && analysis.obv?.data.length)
      paneHandles.push(addObvPane(chart, paneFrame.alloc("obv"), analysis.obv.data));
    if (workspace.params.mfi && !isChartHidden("mfi") && analysis.mfi?.data.length)
      paneHandles.push(addMfiPane(chart, paneFrame.alloc("mfi"), analysis.mfi.data));
    if (workspace.params.cmf && !isChartHidden("cmf") && analysis.cmf?.data.length)
      paneHandles.push(addCmfPane(chart, paneFrame.alloc("cmf"), analysis.cmf.data));
    if (workspace.params.adx && !isChartHidden("adx") && analysis.adx?.data.length)
      paneHandles.push(addAdxPane(chart, paneFrame.alloc("adx"), analysis.adx.data));
    if (workspace.params.showCvd && !isChartHidden("showCvd") && analysis.cvd?.data.length)
      paneHandles.push(addCvdPane(chart, paneFrame.alloc("cvd"), analysis.cvd.data));
    if (workspace.params.stc && !isChartHidden("stc") && analysis.stc?.data.length)
      paneHandles.push(addStcPane(chart, paneFrame.alloc("stc"), analysis.stc.data));
    if (workspace.params.showAtr && !isChartHidden("atr") && analysis.atr?.data.length)
      paneHandles.push(addAtrPane(chart, paneFrame.alloc("atr"), analysis.atr.data));
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

  /* Crosshair cursor rule lives in app.css (uses :has() across child component) */

  @media (max-width: 720px) {
    .chart-wrapper {
      min-height: 280px;
    }
  }
</style>
