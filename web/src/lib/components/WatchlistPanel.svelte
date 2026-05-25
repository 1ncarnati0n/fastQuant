<script lang="ts">
  import { fetchWatchlistSnapshots } from "$lib/api/client";
  import type { MarketType, WatchlistSnapshot } from "$lib/api/types";
  import { workspace } from "$lib/stores/workspace.svelte";
  import { formatRelative, intervalToRefreshMs, type PresetSymbol, type SortMode } from "$lib/utils/presets";
  import {
    buildWatchlistItems,
    createSparklinePath,
    createWatchlistLabelMap,
    filterWatchlistItems,
    getVisibleWatchlistSnapshots,
    type FilterKey,
  } from "$lib/features/watchlist/panelState";
  import { onDestroy } from "svelte";

  let {
    selectedSymbol = "",
    selectedMarket = "usStock" as MarketType,
    interval = "1d",
    filter = "all" as FilterKey,
    sortMode = "name" as SortMode,
    onSelect = () => {},
  }: {
    selectedSymbol?: string;
    selectedMarket?: MarketType;
    interval?: string;
    filter?: FilterKey;
    sortMode?: SortMode;
    onSelect?: (symbol: string, market: MarketType, label?: string) => void;
  } = $props();

  let snapshots = $state<WatchlistSnapshot[]>([]);
  let loading = $state(false);
  let refreshing = $state(false);
  let error = $state<string | null>(null);
  let lastUpdatedAt = $state<Date | null>(null);
  let relLabel = $state<string>("대기 중");

  // Rolling relative-time ticker — updates the label once per second
  let relTicker: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    if (relTicker !== null) clearInterval(relTicker);
    relTicker = setInterval(() => {
      relLabel = formatRelative(lastUpdatedAt);
    }, 1000);
    relLabel = formatRelative(lastUpdatedAt);
    return () => {
      if (relTicker !== null) {
        clearInterval(relTicker);
        relTicker = null;
      }
    };
  });

  // Auto-refresh ticker — period depends on the active interval
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  $effect(() => {
    // Re-arm whenever interval changes; filter changes trigger a fresh load below.
    if (refreshTimer !== null) clearInterval(refreshTimer);
    const period = intervalToRefreshMs(interval);
    if (period === null) return;
    refreshTimer = setInterval(() => {
      void load({ silent: true });
    }, period);
    return () => {
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    };
  });

  onDestroy(() => {
    if (relTicker !== null) clearInterval(relTicker);
    if (refreshTimer !== null) clearInterval(refreshTimer);
  });

  // Registered watchlist items are the single source for this panel.
  const activeItems = $derived.by<PresetSymbol[]>(() => {
    return buildWatchlistItems(workspace.watchlist);
  });

  const filteredItems = $derived(filterWatchlistItems(activeItems, filter));

  const labelMap = $derived(createWatchlistLabelMap(filteredItems));

  // Keep only snapshots that match the current filtered set, sorted by mode
  const visible = $derived.by(() => {
    return getVisibleWatchlistSnapshots(snapshots, filteredItems, sortMode);
  });

  $effect(() => {
    void filteredItems;
    void interval;
    load();
  });

  async function load(opts: { silent?: boolean } = {}) {
    if (filteredItems.length === 0) {
      snapshots = [];
      lastUpdatedAt = null;
      return;
    }
    if (opts.silent) refreshing = true;
    else loading = true;
    error = null;
    try {
      snapshots = await fetchWatchlistSnapshots({
        items: filteredItems.map(({ symbol, market }) => ({ symbol, market })),
        interval,
        limit: 80,
      });
      lastUpdatedAt = new Date();
    } catch (e) {
      error = e instanceof Error ? e.message : "데이터를 불러오지 못했습니다";
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  const isFavorite = $derived((symbol: string, market: MarketType) =>
    workspace.watchlist.some((w) => w.symbol === symbol && w.market === market),
  );

  function toggleFavorite(e: MouseEvent, symbol: string, market: MarketType, label?: string) {
    e.stopPropagation();
    if (isFavorite(symbol, market)) {
      workspace.removeFromWatchlist(symbol, market);
    } else {
      workspace.addToWatchlist(symbol, market, label);
    }
  }

  function select(symbol: string, market: MarketType, label?: string) {
    onSelect(symbol, market, label);
  }

  function sparklinePath(prices: number[], w = 60, h = 28): string {
    return createSparklinePath(prices, w, h);
  }
</script>

<div class="panel">
  <!-- Update stamp -->
  <div class="updated-row" aria-live="polite">
    <span class="updated-label">
      {#if refreshing}
        <span class="mini-spin" aria-hidden="true"></span>
        갱신 중
      {:else}
        {relLabel}
      {/if}
    </span>
    <span class="updated-period">
      {#if intervalToRefreshMs(interval) === null}
        자동 갱신 꺼짐
      {:else}
        자동 {Math.round((intervalToRefreshMs(interval) ?? 0) / 1000)}초
      {/if}
    </span>
  </div>

  <!-- Error -->
  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  <!-- Watchlist rows -->
  <ul class="list">
    {#each visible as snap (snap.symbol + snap.market)}
      {@const active = snap.symbol === selectedSymbol && snap.market === selectedMarket}
      {@const rising = snap.changePct > 0}
      {@const falling = snap.changePct < 0}
      {@const fav = isFavorite(snap.symbol, snap.market)}
      {@const label = labelMap.get(`${snap.symbol}:${snap.market}`)}
      {@const showKrCompanyFirst = snap.market === "krStock" && Boolean(label && label !== snap.symbol)}
      <li class="row-wrap" class:active>
        <button
          type="button"
          class="row"
          onclick={() => select(snap.symbol, snap.market, label)}
          aria-label={showKrCompanyFirst ? `${label} ${snap.symbol} 선택` : `${snap.symbol} 선택`}
        >
          <div class="row-head">
            <div class="row-head__left">
              {#if showKrCompanyFirst}
                <span class="row-company">{label}</span>
                <span class="row-code">{snap.symbol}</span>
              {:else}
                <span class="row-sym">{snap.symbol}</span>
                {#if label && label !== snap.symbol}
                  <span class="row-lbl">{label}</span>
                {/if}
              {/if}
            </div>
            <span class="row-price">
              {snap.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>
          </div>

          <div class="row-foot">
            <svg class="sparkline" viewBox="0 0 60 28" preserveAspectRatio="none" aria-hidden="true">
              {#if snap.sparkline.length >= 2}
                <path
                  d={sparklinePath(snap.sparkline)}
                  fill="none"
                  stroke={rising ? "var(--candle-up)" : falling ? "var(--candle-down)" : "var(--muted-fore)"}
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              {/if}
            </svg>

            <span class="row-chg" class:up={rising} class:down={falling} class:flat={!rising && !falling}>
              {rising ? "+" : ""}{snap.changePct.toFixed(2)}%
            </span>
          </div>
        </button>

        <button
          type="button"
          class="fav-btn"
          class:is-favorite={fav}
          onclick={(e) => toggleFavorite(e, snap.symbol, snap.market, label)}
          aria-label={fav ? `${snap.symbol} 즐겨찾기 해제` : `${snap.symbol} 즐겨찾기 추가`}
          aria-pressed={fav}
          title={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={fav ? "currentColor" : "none"}
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </li>
    {/each}

    {#if visible.length === 0 && !loading && !error}
      <li class="empty">
        등록된 관심종목이 없습니다.
      </li>
    {/if}
  </ul>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 14px 18px 20px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .error-msg {
    font-size: var(--fs-sm);
    color: var(--danger);
    padding: 4px 2px;
  }

  /* Last-updated row */
  .updated-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 0 2px 13px;
    font-size: var(--fs-2xs);
    color: var(--muted);
  }

  .updated-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .updated-period {
    color: color-mix(in srgb, var(--muted) 65%, transparent);
    font-variant-numeric: tabular-nums;
  }

  .mini-spin {
    display: inline-block;
    width: 8px;
    height: 8px;
    border: 1.5px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* List */
  .list {
    display: flex;
    flex-direction: column;
    gap: 0;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .row-wrap {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 78px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    transition: background var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }

  .row-wrap:hover { background: color-mix(in srgb, var(--muted-bg) 54%, transparent); }
  .row-wrap.active {
    background: color-mix(in srgb, var(--primary) 4%, var(--card));
    box-shadow: inset 2px 0 var(--primary);
  }

  .row {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 13px 9px;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    min-width: 0;
  }

  .row-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .row-head__left {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .row-sym {
    font-size: var(--fs-md);
    font-weight: 700;
    letter-spacing: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-lbl {
    font-size: var(--fs-xs);
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .row-company {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text);
  }

  .row-code {
    flex-shrink: 0;
    font-size: var(--fs-2xs);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .row-price {
    font-size: var(--fs-md);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .row-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .sparkline {
    width: 100%;
    max-width: 124px;
    height: 22px;
    overflow: visible;
  }

  .row-chg {
    font-size: var(--fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .up { color: var(--candle-up); }
  .down { color: var(--candle-down); }
  .flat { color: var(--muted-fore); }

  .fav-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-right: 1px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    opacity: 0;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), opacity var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .row-wrap:hover .fav-btn,
  .fav-btn.is-favorite {
    opacity: 1;
  }

  .fav-btn:hover { color: var(--warning); background: color-mix(in srgb, var(--warning) 14%, transparent); }

  .fav-btn.is-favorite {
    color: var(--warning);
  }

  .empty {
    padding: 24px 8px;
    text-align: center;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
</style>
