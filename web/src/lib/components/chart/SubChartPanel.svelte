<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
  import type { AnalysisResponse } from "$lib/api/types";
  import { chartSync } from "$lib/stores/chartSync.svelte";

  export type SubPanelType =
    | "volume" | "rsi" | "macd" | "stoch"
    | "obv" | "mfi" | "cmf" | "adx" | "cvd" | "stc" | "atr";

  let {
    type,
    analysis = null,
    onClose,
  }: {
    type: SubPanelType;
    analysis?: AnalysisResponse | null;
    onClose?: () => void;
  } = $props();

  const TITLE: Record<SubPanelType, string> = {
    volume: "거래량 (VOL)",
    rsi: "RSI",
    macd: "MACD",
    stoch: "스토캐스틱",
    obv: "OBV",
    mfi: "MFI",
    cmf: "CMF",
    adx: "ADX",
    cvd: "CVD",
    stc: "STC",
    atr: "ATR",
  };

  let container: HTMLDivElement;
  let chart = $state<IChartApi | null>(null);
  let activeSeries: ISeriesApi<SeriesType>[] = [];
  let resizeObs: ResizeObserver | null = null;
  let lcMod: typeof import("lightweight-charts") | null = null;
  let currentVal = $state("");

  function readPalette() {
    if (typeof window === "undefined") {
      return { bg: "#131722", text: "#b2b5be", grid: "rgba(42,46,57,0.58)" };
    }
    const s = window.getComputedStyle(document.documentElement);
    const v = (n: string, fb: string) => s.getPropertyValue(n).trim() || fb;
    return {
      bg: v("--chart-bg", "#131722"),
      text: v("--chart-fore", "#b2b5be"),
      grid: v("--chart-grid", "rgba(42,46,57,0.58)"),
    };
  }

  onMount(async () => {
    lcMod = await import("lightweight-charts");
    const p = readPalette();

    chart = lcMod.createChart(container, {
      layout: {
        background: { color: p.bg },
        textColor: p.text,
        fontFamily: "'Noto Sans KR', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: p.grid },
        horzLines: { color: p.grid },
      },
      rightPriceScale: { borderVisible: false, minimumWidth: 58 },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { horzLine: { labelVisible: false }, vertLine: { labelVisible: false } },
    });

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      chart.applyOptions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    }

    resizeObs = new ResizeObserver(([e]) => {
      chart?.applyOptions({
        width: Math.floor(e.contentRect.width),
        height: Math.floor(e.contentRect.height),
      });
    });
    resizeObs.observe(container);

    if (analysis) syncData();
  });

  onDestroy(() => {
    resizeObs?.disconnect();
    chart?.remove();
    chart = null;
  });

  // Time-scale sync with main chart
  $effect(() => {
    const main = chartSync.mainChart;
    const sub = chart;
    if (!main || !sub) return;

    let lock = false;

    const h1 = (r: import("lightweight-charts").LogicalRange | null) => {
      if (lock || !r) return;
      lock = true;
      try { sub.timeScale().setVisibleLogicalRange(r); } catch { /* ignore */ }
      lock = false;
    };
    const h2 = (r: import("lightweight-charts").LogicalRange | null) => {
      if (lock || !r) return;
      lock = true;
      try { main.timeScale().setVisibleLogicalRange(r); } catch { /* ignore */ }
      lock = false;
    };

    main.timeScale().subscribeVisibleLogicalRangeChange(h1);
    sub.timeScale().subscribeVisibleLogicalRangeChange(h2);

    return () => {
      main.timeScale().unsubscribeVisibleLogicalRangeChange(h1);
      sub.timeScale().unsubscribeVisibleLogicalRangeChange(h2);
    };
  });

  // Re-sync when analysis changes
  $effect(() => {
    const _a = analysis;
    if (chart && lcMod) syncData();
  });

  function clearSeries() {
    for (const s of activeSeries) {
      try { chart?.removeSeries(s); } catch { /* ignore */ }
    }
    activeSeries = [];
  }

  function syncData() {
    const lc = lcMod;
    const c = chart;
    const a = analysis;
    if (!lc || !c || !a) return;

    clearSeries();
    type TS = import("lightweight-charts").UTCTimestamp;

    switch (type) {
      case "volume": {
        const s = c.addSeries(lc.HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
          priceLineVisible: false,
          lastValueVisible: false,
        });
        c.priceScale("vol").applyOptions({
          scaleMargins: { top: 0.05, bottom: 0 },
          borderVisible: false,
        });
        s.setData(a.candles.map((cd) => ({
          time: cd.time as TS,
          value: cd.volume,
          color: cd.close >= cd.open ? "rgba(240,68,82,0.55)" : "rgba(71,136,255,0.55)",
        })));
        activeSeries.push(s);
        const last = a.candles.at(-1);
        if (last) currentVal = formatVol(last.volume);
        break;
      }

      case "rsi": {
        if (!a.rsi.length) break;
        const line = c.addSeries(lc.LineSeries, { color: "#a78bfa", lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: "RSI" });
        const ob = c.addSeries(lc.LineSeries, { color: "rgba(167,139,250,0.3)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        const os = c.addSeries(lc.LineSeries, { color: "rgba(167,139,250,0.3)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        line.setData(a.rsi.map((p) => ({ time: p.time as TS, value: p.value })));
        ob.setData(a.rsi.map((p) => ({ time: p.time as TS, value: 70 })));
        os.setData(a.rsi.map((p) => ({ time: p.time as TS, value: 30 })));
        activeSeries.push(line, ob, os);
        const last = a.rsi.at(-1);
        if (last) currentVal = last.value.toFixed(1);
        break;
      }

      case "macd": {
        if (!a.macd?.data.length) break;
        const hist = c.addSeries(lc.HistogramSeries, { priceLineVisible: false, lastValueVisible: false, priceScaleId: "macd" });
        const macdLine = c.addSeries(lc.LineSeries, { color: "#f04452", lineWidth: 2, priceLineVisible: false, priceScaleId: "macd" });
        const sigLine = c.addSeries(lc.LineSeries, { color: "#4788ff", lineWidth: 2, priceLineVisible: false, priceScaleId: "macd" });
        hist.setData(a.macd.data.map((p) => ({
          time: p.time as TS,
          value: p.histogram,
          color: p.histogram >= 0 ? "rgba(240,68,82,0.6)" : "rgba(71,136,255,0.6)",
        })));
        macdLine.setData(a.macd.data.map((p) => ({ time: p.time as TS, value: p.macd })));
        sigLine.setData(a.macd.data.map((p) => ({ time: p.time as TS, value: p.signal })));
        activeSeries.push(hist, macdLine, sigLine);
        const last = a.macd.data.at(-1);
        if (last) currentVal = `${last.histogram >= 0 ? "+" : ""}${last.histogram.toFixed(4)}`;
        break;
      }

      case "stoch": {
        if (!a.stochastic?.data.length) break;
        const kLine = c.addSeries(lc.LineSeries, { color: "#60a5fa", lineWidth: 2, priceLineVisible: false, title: "K" });
        const dLine = c.addSeries(lc.LineSeries, { color: "#f59e0b", lineWidth: 2, priceLineVisible: false, title: "D" });
        const ob = c.addSeries(lc.LineSeries, { color: "rgba(167,139,250,0.3)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        const os = c.addSeries(lc.LineSeries, { color: "rgba(167,139,250,0.3)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        kLine.setData(a.stochastic.data.map((p) => ({ time: p.time as TS, value: p.k })));
        dLine.setData(a.stochastic.data.map((p) => ({ time: p.time as TS, value: p.d })));
        ob.setData(a.stochastic.data.map((p) => ({ time: p.time as TS, value: 80 })));
        os.setData(a.stochastic.data.map((p) => ({ time: p.time as TS, value: 20 })));
        activeSeries.push(kLine, dLine, ob, os);
        const last = a.stochastic.data.at(-1);
        if (last) currentVal = `K ${last.k.toFixed(1)}  D ${last.d.toFixed(1)}`;
        break;
      }

      case "adx": {
        if (!a.adx?.data.length) break;
        const adxLine = c.addSeries(lc.LineSeries, { color: "#facc15", lineWidth: 2, priceLineVisible: false, title: "ADX" });
        const plusLine = c.addSeries(lc.LineSeries, { color: "#4ade80", lineWidth: 2, priceLineVisible: false, title: "+DI" });
        const minusLine = c.addSeries(lc.LineSeries, { color: "#f87171", lineWidth: 2, priceLineVisible: false, title: "-DI" });
        adxLine.setData(a.adx.data.map((p) => ({ time: p.time as TS, value: p.adx })));
        plusLine.setData(a.adx.data.map((p) => ({ time: p.time as TS, value: p.plusDi })));
        minusLine.setData(a.adx.data.map((p) => ({ time: p.time as TS, value: p.minusDi })));
        activeSeries.push(adxLine, plusLine, minusLine);
        const last = a.adx.data.at(-1);
        if (last) currentVal = `ADX ${last.adx.toFixed(1)}  +DI ${last.plusDi.toFixed(1)}  -DI ${last.minusDi.toFixed(1)}`;
        break;
      }

      default: {
        // Generic single-line panels: obv, mfi, cmf, cvd, stc, atr
        const data = getGenericData(type, a);
        if (!data?.length) break;

        const COLOR: Record<string, string> = {
          obv: "#22d3ee", mfi: "#fb923c", cmf: "#a3e635",
          cvd: "#f472b6", stc: "#818cf8", atr: "#94a3b8",
        };
        const line = c.addSeries(lc.LineSeries, {
          color: COLOR[type] ?? "#22d3ee",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        line.setData(data.map((p) => ({ time: p.time as TS, value: p.value })));
        activeSeries.push(line);
        const last = data.at(-1);
        if (last) currentVal = last.value.toFixed(2);
        break;
      }
    }
  }

  function getGenericData(
    t: SubPanelType,
    a: AnalysisResponse,
  ): Array<{ time: number; value: number }> | null {
    switch (t) {
      case "obv": return a.obv?.data ?? null;
      case "mfi": return a.mfi?.data ?? null;
      case "cmf": return a.cmf?.data ?? null;
      case "cvd": return a.cvd?.data ?? null;
      case "stc": return a.stc?.data ?? null;
      case "atr": return a.atr?.data ?? null;
      default: return null;
    }
  }

  function formatVol(v: number): string {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  }
</script>

<div class="sub-panel">
  <header class="sub-header">
    <button class="close-btn" type="button" onclick={onClose} aria-label="패널 닫기">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <span class="title">{TITLE[type]}</span>
    {#if currentVal}
      <span class="current-val">{currentVal}</span>
    {/if}
  </header>
  <div bind:this={container} class="sub-chart"></div>
</div>

<style>
  .sub-panel {
    display: flex;
    flex-direction: column;
    height: 132px;
    flex-shrink: 0;
    border-top: 1px solid var(--line-soft);
    background: var(--surface);
  }

  .sub-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    height: 26px;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--surface) 96%, var(--text) 4%);
    border-bottom: 1px solid var(--line-soft);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    padding: 0;
    border-radius: 3px;
    flex-shrink: 0;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .close-btn:hover {
    background: color-mix(in srgb, var(--danger) 15%, transparent);
    color: var(--danger);
  }

  .title {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .current-val {
    font-size: var(--fs-xs);
    color: var(--accent);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .sub-chart {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
