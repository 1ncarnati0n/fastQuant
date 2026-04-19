<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { IChartApi, ISeriesApi } from "lightweight-charts";
  import type { PointValue } from "$lib/api/types";

  let { data = [] }: { data?: PointValue[] } = $props();

  let container: HTMLDivElement;
  let chart = $state<IChartApi | null>(null);
  let lineSeries = $state<ISeriesApi<"Line"> | null>(null);
  let resizeObserver: ResizeObserver | null = null;

  function readPalette() {
    if (typeof window === "undefined") {
      return { bg: "#131722", text: "#b2b5be", grid: "rgba(42,46,57,0.58)", line: "#22c55e" };
    }
    const s = window.getComputedStyle(document.documentElement);
    const v = (n: string, fb: string) => s.getPropertyValue(n).trim() || fb;
    return {
      bg:   v("--chart-bg",   "#131722"),
      text: v("--chart-fore", "#b2b5be"),
      grid: v("--chart-grid", "rgba(42,46,57,0.58)"),
      line: v("--success",    "#22c55e"),
    };
  }

  onMount(async () => {
    const { createChart, LineSeries } = await import("lightweight-charts");
    const p = readPalette();

    chart = createChart(container, {
      layout: {
        background: { color: p.bg },
        textColor: p.text,
        fontFamily: "'Noto Sans KR', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: p.grid },
        horzLines: { color: p.grid },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    lineSeries = chart.addSeries(LineSeries, {
      color: p.line,
      lineWidth: 2,
      priceLineVisible: false,
    });

    resizeObserver = new ResizeObserver(([entry]) => {
      chart?.applyOptions({
        width:  Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      });
    });
    resizeObserver.observe(container);
    syncData();
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    chart?.remove();
    chart = null;
    lineSeries = null;
  });

  // Re-sync whenever data prop changes
  $effect(() => {
    // access data to create reactive dependency
    const _ = data;
    if (lineSeries) syncData();
  });

  function syncData() {
    if (!lineSeries || !chart) return;
    lineSeries.setData(
      data.map((pt) => ({
        time:  pt.time as import("lightweight-charts").UTCTimestamp,
        value: pt.value,
      })),
    );
    chart.timeScale().fitContent();
  }
</script>

<div bind:this={container} class="equity-chart" aria-label="자산 곡선 차트"></div>

<style>
  .equity-chart {
    width: 100%;
    min-height: 240px;
    height: 30vh;
    background: var(--chart-bg);
  }
</style>
