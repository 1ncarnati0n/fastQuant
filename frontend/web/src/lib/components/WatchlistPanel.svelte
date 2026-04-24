<script lang="ts">
  import { fetchWatchlistSnapshots, searchSymbols } from "$lib/api/client";
  import type { MarketType, SymbolSearchResult, WatchlistSnapshot } from "$lib/api/types";
  import { workspace } from "$lib/stores/workspace.svelte";
  import { formatRelative, intervalToRefreshMs, type PresetSymbol, type SortMode } from "$lib/utils/presets";
  import { getKrStockLabel } from "$lib/utils/krStocks";
  import {
    screener,
    BUILTIN_PRESETS,
    FIELD_LABELS,
    OP_LABELS,
    type ScreenerField,
    type ScreenerOp,
  } from "$lib/stores/screener.svelte";
  import {
    WATCHLIST_FILTERS,
    WATCHLIST_MODES,
    WATCHLIST_SORT_OPTIONS,
    buildWatchlistItems,
    createSparklinePath,
    createWatchlistLabelMap,
    filterWatchlistItems,
    formatScreenerRule,
    getVisibleWatchlistSnapshots,
    type FilterKey,
    type ListMode,
  } from "$lib/features/watchlist/panelState";
  import { onDestroy } from "svelte";

  let {
    selectedSymbol = "",
    selectedMarket = "usStock" as MarketType,
    interval = "1d",
    onSelect = () => {},
  }: {
    selectedSymbol?: string;
    selectedMarket?: MarketType;
    interval?: string;
    onSelect?: (symbol: string, market: MarketType, label?: string) => void;
  } = $props();

  let snapshots = $state<WatchlistSnapshot[]>([]);
  let query = $state("");
  let searchResults = $state<SymbolSearchResult[]>([]);
  let loading = $state(false);
  let refreshing = $state(false);
  let searching = $state(false);
  let error = $state<string | null>(null);
  let filter = $state<FilterKey>("all");
  let listMode = $state<ListMode>("favorite");
  let sortMode = $state<SortMode>("name");
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
    // Re-arm whenever interval changes (or when listMode/filter changes, via load)
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

  // Items to request snapshots for, based on the active mode
  const activeItems = $derived.by<PresetSymbol[]>(() => {
    return buildWatchlistItems(listMode, workspace.watchlist, workspace.recentSymbols);
  });

  const filteredItems = $derived(filterWatchlistItems(activeItems, filter));

  const labelMap = $derived(createWatchlistLabelMap(filteredItems));

  // Keep only snapshots that match the current filtered set, optionally screened, sorted by mode
  const visible = $derived.by(() => {
    return getVisibleWatchlistSnapshots(snapshots, filteredItems, sortMode, {
      enabled: screener.enabled,
      rules: screener.rules,
      mode: screener.mode,
    });
  });

  // ── Custom screener rule draft ───────────────
  let ruleField = $state<ScreenerField>("changePct");
  let ruleOp = $state<ScreenerOp>("gte");
  let ruleValue = $state<string>("3");

  function addCustomRule() {
    const v = parseFloat(ruleValue);
    if (!Number.isFinite(v)) return;
    screener.addRule({ field: ruleField, op: ruleOp, value: v });
  }

  function fmtRule(f: ScreenerField, op: ScreenerOp, value: number): string {
    return formatScreenerRule(f, op, value);
  }

  $effect(() => {
    void filteredItems;
    void interval;
    load();
  });

  $effect(() => {
    const q = query.trim();
    if (q.length < 2) { searchResults = []; searching = false; return; }
    searching = true;
    const t = setTimeout(async () => {
      try { searchResults = await searchSymbols(q); }
      catch { searchResults = []; }
      finally { searching = false; }
    }, 250);
    return () => clearTimeout(t);
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
    query = "";
    searchResults = [];
  }

  function searchResultLabel(item: SymbolSearchResult): string {
    return item.market === "krStock" ? (getKrStockLabel(item.symbol) ?? item.label) : item.label;
  }

  function addItem(item: SymbolSearchResult, label = item.label) {
    workspace.addToWatchlist(item.symbol, item.market, label);
    query = "";
    searchResults = [];
  }

  function sparklinePath(prices: number[], w = 60, h = 28): string {
    return createSparklinePath(prices, w, h);
  }
</script>

<div class="panel">
  <!-- Search -->
  <div class="search-wrap">
    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
    <input
      bind:value={query}
      type="search"
      placeholder="종목 검색 (AAPL, BTC…)"
      class="search-input"
      aria-label="종목 검색"
    />
    {#if loading}
      <div class="spin" aria-label="로딩"></div>
    {:else}
      <button type="button" class="refresh-btn" title="새로고침" onclick={() => load()} aria-label="새로고침">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Search results dropdown -->
  {#if query.trim().length >= 2}
    <div class="dropdown" role="listbox">
      {#if searching}
        <div class="dropdown-msg">검색 중…</div>
      {:else if searchResults.length === 0}
        <div class="dropdown-msg">결과 없음</div>
      {:else}
        {#each searchResults.slice(0, 8) as item}
          {@const inList = workspace.watchlist.some(w => w.symbol === item.symbol && w.market === item.market)}
          {@const displayLabel = searchResultLabel(item)}
          <div class="dropdown-row" role="option" aria-selected="false">
            <button type="button" class="dropdown-select" onclick={() => select(item.symbol, item.market, displayLabel)}>
              <span class="sym">{item.symbol}</span>
              <span class="lbl">{displayLabel} · {item.exchange}</span>
            </button>
            <button
              type="button"
              class="add-btn"
              class:added={inList}
              title={inList ? "목록에 있음" : "관심종목 추가"}
              onclick={() => !inList && addItem(item, displayLabel)}
              aria-label={inList ? "이미 추가됨" : "관심종목 추가"}
            >
              {#if inList}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              {:else}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              {/if}
            </button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <!-- Mode tabs (favorite/recent/all) -->
  <div class="modes" role="tablist" aria-label="목록 모드">
    {#each WATCHLIST_MODES as m}
      <button
        type="button"
        role="tab"
        class="mode-btn"
        class:active={listMode === m.key}
        aria-selected={listMode === m.key}
        onclick={() => (listMode = m.key)}
      >
        {m.label}
        {#if m.key === "favorite"}
          <span class="mode-count">{workspace.watchlist.length}</span>
        {:else if m.key === "recent"}
          <span class="mode-count">{workspace.recentSymbols.length}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Market filter + sort -->
  <div class="controls">
    <div class="filters" role="tablist" aria-label="마켓 필터">
      {#each WATCHLIST_FILTERS as f}
        <button
          type="button"
          role="tab"
          class="filter-btn"
          class:active={filter === f.key}
          aria-selected={filter === f.key}
          onclick={() => (filter = f.key)}
        >{f.label}</button>
      {/each}
    </div>
    <div class="sort" role="group" aria-label="정렬">
      {#each WATCHLIST_SORT_OPTIONS as s}
        <button
          type="button"
          class="sort-btn"
          class:active={sortMode === s.key}
          onclick={() => (sortMode = s.key)}
          aria-pressed={sortMode === s.key}
        >
          {s.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Screener -->
  <div class="screener" class:is-on={screener.enabled}>
    <div class="screener__head">
      <button
        type="button"
        class="screener__toggle"
        class:is-on={screener.enabled}
        onclick={() => screener.toggleEnabled()}
        aria-pressed={screener.enabled}
        aria-label="스크리너 토글"
      >
        <span class="screener__dot"></span>
        스크리너 {screener.enabled ? "ON" : "OFF"}
      </button>

      <div class="screener__mode" role="group" aria-label="매칭 모드">
        <button
          type="button"
          class="mode-mini"
          class:active={screener.mode === "all"}
          onclick={() => screener.setMode("all")}
          disabled={!screener.enabled}
        >ALL</button>
        <button
          type="button"
          class="mode-mini"
          class:active={screener.mode === "any"}
          onclick={() => screener.setMode("any")}
          disabled={!screener.enabled}
        >ANY</button>
      </div>

      <select
        class="preset-select"
        disabled={!screener.enabled}
        aria-label="프리셋 적용"
        value=""
        onchange={(e) => {
          const el = e.currentTarget as HTMLSelectElement;
          const id = el.value;
          if (!id) return;
          const found = BUILTIN_PRESETS.find((p) => p.id === id) ?? screener.userPresets.find((p) => p.id === id);
          if (found) screener.applyPreset(found);
          el.value = "";
        }}
      >
        <option value="" disabled>프리셋 선택…</option>
        <optgroup label="기본">
          {#each BUILTIN_PRESETS as preset}
            <option value={preset.id}>{preset.name}</option>
          {/each}
        </optgroup>
        {#if screener.userPresets.length > 0}
          <optgroup label="내 프리셋">
            {#each screener.userPresets as preset}
              <option value={preset.id}>{preset.name}</option>
            {/each}
          </optgroup>
        {/if}
      </select>
    </div>

    {#if screener.enabled}
      {#if screener.rules.length > 0}
        <div class="rule-chips">
          {#each screener.rules as r (r.id)}
            <span class="rule-chip" title={FIELD_LABELS[r.field]}>
              {fmtRule(r.field, r.op, r.value)}
              <button
                type="button"
                class="rule-chip__x"
                onclick={() => screener.removeRule(r.id)}
                aria-label="규칙 삭제"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          {/each}
          {#if screener.rules.length > 1}
            <button type="button" class="rule-clear" onclick={() => screener.clearRules()}>
              모두 삭제
            </button>
          {/if}
        </div>
      {/if}

      <form class="rule-form" onsubmit={(e) => { e.preventDefault(); addCustomRule(); }}>
        <select bind:value={ruleField} class="rule-input rule-field" aria-label="필드">
          {#each Object.entries(FIELD_LABELS) as [k, v]}
            <option value={k}>{v}</option>
          {/each}
        </select>
        <select bind:value={ruleOp} class="rule-input rule-op" aria-label="연산자">
          {#each Object.entries(OP_LABELS) as [k, v]}
            <option value={k}>{v}</option>
          {/each}
        </select>
        <input
          bind:value={ruleValue}
          type="number"
          step="0.1"
          class="rule-input rule-value"
          placeholder="값"
          aria-label="값"
        />
        <button type="submit" class="rule-add" aria-label="규칙 추가" title="규칙 추가">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </form>
    {/if}
  </div>

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
      {@const up = snap.changePct >= 0}
      {@const fav = isFavorite(snap.symbol, snap.market)}
      {@const label = labelMap.get(`${snap.symbol}:${snap.market}`)}
      <li class="row-wrap" class:active>
        <button
          type="button"
          class="row"
          onclick={() => select(snap.symbol, snap.market, label)}
          aria-label="{snap.symbol} 선택"
        >
          <div class="row-head">
            <div class="row-head__left">
              <span class="row-sym">{snap.symbol}</span>
              {#if label && label !== snap.symbol}
                <span class="row-lbl">{label}</span>
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
                  stroke={up ? "var(--success)" : "var(--danger)"}
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              {/if}
            </svg>

            <span class="row-chg" class:up class:down={!up}>
              {up ? "▲" : "▼"} {Math.abs(snap.changePct).toFixed(2)}%
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
        {#if listMode === "favorite"}
          즐겨찾기가 없습니다. <br />"전체" 탭이나 검색에서 ★를 눌러 추가하세요.
        {:else if listMode === "recent"}
          아직 최근 본 종목이 없습니다.
        {:else}
          데이터를 불러오는 중…
        {/if}
      </li>
    {/if}
  </ul>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 8px 10px 12px;
  }

  /* Search */
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: var(--muted);
    pointer-events: none;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 8px 36px 8px 30px;
    font: inherit;
    font-size: var(--fs-sm);
    background: var(--bg);
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
  }

  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--muted); }
  .search-input::-webkit-search-cancel-button { display: none; }

  .refresh-btn {
    position: absolute;
    right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color 0.12s, background 0.12s;
  }

  .refresh-btn:hover { color: var(--text); background: color-mix(in srgb, var(--text) 8%, transparent); }

  .spin {
    position: absolute;
    right: 10px;
    width: 14px;
    height: 14px;
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Dropdown */
  .dropdown {
    position: absolute;
    top: calc(100% + 2px);
    left: 10px;
    right: 10px;
    z-index: 20;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  /* The panel itself needs relative positioning for dropdown */
  .panel { position: relative; }

  .dropdown-msg {
    padding: 10px 12px;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .dropdown-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--line-soft);
  }

  .dropdown-row:last-child { border-bottom: none; }

  .dropdown-select {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text);
    text-align: left;
    transition: background 0.1s;
  }

  .dropdown-select:hover { background: color-mix(in srgb, var(--text) 5%, transparent); }

  .sym { font-size: var(--fs-sm); font-weight: 600; }
  .lbl { font-size: var(--fs-xs); color: var(--muted); }

  .add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    border: none;
    border-left: 1px solid var(--line-soft);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color 0.12s, background 0.12s;
  }

  .add-btn:hover { color: var(--accent); background: var(--accent-soft); }
  .add-btn.added { color: var(--success); cursor: default; }

  /* Filters */
  .filters {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 4px 10px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-xs);
    cursor: pointer;
    transition: color 0.12s, background 0.12s, border-color 0.12s;
  }

  .filter-btn:hover { color: var(--text); background: color-mix(in srgb, var(--text) 6%, transparent); }
  .filter-btn.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 600; }

  /* Mode tabs */
  .modes {
    display: flex;
    gap: 2px;
    padding: 2px;
    margin-bottom: 8px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--input);
  }

  .mode-btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 6px 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-sm);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .mode-btn:hover { color: var(--text); background: color-mix(in srgb, var(--text) 6%, transparent); }

  .mode-btn.active {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  .mode-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 18%, transparent);
    color: inherit;
    font-size: var(--fs-2xs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  /* Controls: filters + sort on one row */
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .sort {
    display: inline-flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--input);
  }

  .sort-btn {
    padding: 3px 8px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-xs);
    cursor: pointer;
  }

  .sort-btn:hover { color: var(--text); }

  .sort-btn.active {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 700;
  }

  .error-msg {
    font-size: var(--fs-sm);
    color: var(--danger);
    padding: 4px 2px;
  }

  /* ── Screener ────────────────────────────── */
  .screener {
    margin-bottom: 8px;
    padding: 8px;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: color-mix(in srgb, var(--input) 60%, transparent);
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .screener.is-on {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    background: color-mix(in srgb, var(--accent-soft) 40%, var(--input));
  }

  .screener__head {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .screener__toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .screener__toggle.is-on {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
  }

  .screener__dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--muted);
    transition: background var(--dur-fast) var(--ease);
  }

  .screener__toggle.is-on .screener__dot {
    background: var(--accent);
    box-shadow: 0 0 4px color-mix(in srgb, var(--accent) 60%, transparent);
  }

  .screener__mode {
    display: inline-flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
  }

  .mode-mini {
    padding: 2px 7px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-2xs);
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.04em;
  }

  .mode-mini:disabled { opacity: 0.4; cursor: not-allowed; }
  .mode-mini:not(:disabled):hover { color: var(--text); }

  .mode-mini.active:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .preset-select {
    flex: 1;
    min-width: 120px;
    padding: 3px 6px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-xs);
    cursor: pointer;
  }

  .preset-select:disabled { opacity: 0.45; cursor: not-allowed; }

  .rule-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .rule-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 4px 3px 8px;
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .rule-chip__x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
  }

  .rule-chip__x:hover { opacity: 1; }

  .rule-clear {
    padding: 3px 8px;
    border: 1px dashed var(--line);
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-2xs);
    cursor: pointer;
  }

  .rule-clear:hover { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--line)); }

  .rule-form {
    display: grid;
    grid-template-columns: 1fr 40px 70px 26px;
    gap: 4px;
    margin-top: 6px;
  }

  .rule-input {
    padding: 4px 6px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-xs);
    outline: none;
  }

  .rule-input:focus { border-color: color-mix(in srgb, var(--accent) 50%, var(--line)); }

  .rule-value { text-align: right; font-variant-numeric: tabular-nums; }

  .rule-add {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
    border-radius: 6px;
    background: var(--accent-soft);
    color: var(--accent);
    cursor: pointer;
  }

  .rule-add:hover {
    background: color-mix(in srgb, var(--accent) 25%, var(--accent-soft));
  }

  /* Last-updated row */
  .updated-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 0 2px 6px;
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
    gap: 2px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .row-wrap {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 7px;
    transition: border-color 0.12s, background 0.12s;
  }

  .row-wrap:hover { background: color-mix(in srgb, var(--text) 4%, transparent); border-color: var(--line); }
  .row-wrap.active { border-color: var(--accent); background: var(--accent-soft); }

  .row {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 7px 8px;
    border: none;
    border-radius: 7px;
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
    font-size: var(--fs-base);
    font-weight: 700;
    letter-spacing: -0.01em;
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

  .row-price {
    font-size: var(--fs-base);
    font-weight: 600;
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
    max-width: 130px;
    height: 24px;
    overflow: visible;
  }

  .row-chg {
    font-size: var(--fs-xs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .up { color: var(--success); }
  .down { color: var(--danger); }

  .fav-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 4px;
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
