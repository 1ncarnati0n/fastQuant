<script lang="ts">
  import { onMount } from "svelte";
  import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
  import type { Candle } from "$lib/api/types";

  let {
    chart,
    series,
    candles,
    numBuckets = 50,
    widthFraction = 0.14,
  }: {
    chart: IChartApi | null;
    series: ISeriesApi<SeriesType> | null;
    candles: Candle[];
    numBuckets?: number;
    widthFraction?: number;
  } = $props();

  let container: HTMLDivElement;
  let width = $state(0);
  let height = $state(0);
  let chartRange = $state<{ from: number; to: number } | null>(null);

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      width = Math.floor(entry.contentRect.width);
      height = Math.floor(entry.contentRect.height);
    });
    ro.observe(container);

    const onRangeChange = (range: import("lightweight-charts").LogicalRange | null) => {
      chartRange = range ? { from: range.from, to: range.to } : null;
    };
    chart?.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    return () => {
      ro.disconnect();
      chart?.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
    };
  });

  interface Bucket {
    priceLow: number;
    priceHigh: number;
    volume: number;
    bullVolume: number;
  }

  const profile = $derived.by(() => {
    if (!candles.length) return [] as Bucket[];

    const lo = Math.min(...candles.map((c) => c.low));
    const hi = Math.max(...candles.map((c) => c.high));
    const span = hi - lo;
    if (span === 0) return [] as Bucket[];

    const size = span / numBuckets;
    const buckets: Bucket[] = Array.from({ length: numBuckets }, (_, i) => ({
      priceLow: lo + i * size,
      priceHigh: lo + (i + 1) * size,
      volume: 0,
      bullVolume: 0,
    }));

    for (const c of candles) {
      const center = (c.high + c.low) / 2;
      const idx = Math.min(Math.floor((center - lo) / size), numBuckets - 1);
      if (idx >= 0) {
        buckets[idx].volume += c.volume;
        if (c.close >= c.open) buckets[idx].bullVolume += c.volume;
      }
    }

    return buckets;
  });

  const bars = $derived.by(() => {
    void chartRange;
    if (!profile.length || !series || width === 0 || height === 0) return [];

    const maxVol = Math.max(...profile.map((b) => b.volume));
    if (maxVol === 0) return [];

    const maxW = width * widthFraction;

    return profile
      .map((b) => {
        const yTop = series.priceToCoordinate(b.priceHigh);
        const yBot = series.priceToCoordinate(b.priceLow);
        if (yTop === null || yBot === null) return null;

        const barW = (b.volume / maxVol) * maxW;
        const barH = Math.max(1, Math.abs(yBot - yTop));
        const isBull = b.volume > 0 && b.bullVolume / b.volume > 0.5;

        return { x: width - barW, y: Math.min(yTop, yBot), w: barW, h: barH, isBull };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null && b.w > 0.5);
  });
</script>

<div bind:this={container} class="layer" aria-hidden="true">
  <svg {width} {height} class="svg">
    {#each bars as bar}
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.w}
        height={bar.h}
        fill={bar.isBull ? "rgba(240,68,82,0.20)" : "rgba(71,136,255,0.20)"}
      />
    {/each}
  </svg>
</div>

<style>
  .layer {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
  }

  .svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
</style>
