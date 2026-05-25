<script lang="ts">
  import { searchSymbols } from "$lib/api/client";
  import type { MarketType, SymbolSearchResult } from "$lib/api/types";
  import { workspace } from "$lib/stores/workspace.svelte";
  import { getKrStockLabel } from "$lib/utils/krStocks";
  import { WATCHLIST_FILTERS, WATCHLIST_SORT_OPTIONS, type FilterKey } from "$lib/features/watchlist/panelState";
  import type { SortMode } from "$lib/utils/presets";

  let {
    filter = "all" as FilterKey,
    sortMode = "name" as SortMode,
    onSelect = () => {},
    onFilterChange = () => {},
    onSortChange = () => {},
  }: {
    filter?: FilterKey;
    sortMode?: SortMode;
    onSelect?: (symbol: string, market: MarketType, label?: string) => void;
    onFilterChange?: (filter: FilterKey) => void;
    onSortChange?: (sortMode: SortMode) => void;
  } = $props();

  let query = $state("");
  let searchResults = $state<SymbolSearchResult[]>([]);
  let searching = $state(false);
  let searchError = $state<string | null>(null);
  let searchRequestId = 0;

  $effect(() => {
    const q = query.trim();
    const requestId = ++searchRequestId;
    if (q.length < 2) {
      searchResults = [];
      searching = false;
      searchError = null;
      return;
    }
    searching = true;
    searchError = null;
    const timer = setTimeout(async () => {
      try {
        const results = await searchSymbols(q);
        if (requestId === searchRequestId) searchResults = results;
      } catch {
        if (requestId === searchRequestId) {
          searchResults = [];
          searchError = "종목 검색 API 연결 실패";
        }
      } finally {
        if (requestId === searchRequestId) searching = false;
      }
    }, 250);
    return () => clearTimeout(timer);
  });

  function displayLabel(item: SymbolSearchResult): string {
    return item.market === "krStock" ? (getKrStockLabel(item.symbol) ?? item.label) : item.label;
  }

  function select(item: SymbolSearchResult, label: string) {
    onSelect(item.symbol, item.market, label);
    query = "";
    searchResults = [];
  }

  function addItem(item: SymbolSearchResult, label: string) {
    workspace.addToWatchlist(item.symbol, item.market, label);
    query = "";
    searchResults = [];
  }
</script>

<div class="search">
  <div class="search-field">
    <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
    <input
      bind:value={query}
      type="search"
      placeholder="종목 검색"
      class="search-input"
      aria-label="종목 검색 후 관심종목 추가"
    />
    {#if searching}
      <div class="spin" aria-label="검색 중"></div>
    {/if}
  </div>

  <div class="controls">
    <div class="segments" role="tablist" aria-label="마켓 필터">
      {#each WATCHLIST_FILTERS as option}
        <button
          type="button"
          role="tab"
          class="segment-btn"
          class:active={filter === option.key}
          aria-selected={filter === option.key}
          onclick={() => onFilterChange(option.key)}
        >{option.label}</button>
      {/each}
    </div>
    <div class="segments segments--sort" role="group" aria-label="정렬">
      {#each WATCHLIST_SORT_OPTIONS as option}
        <button
          type="button"
          class="segment-btn"
          class:active={sortMode === option.key}
          aria-pressed={sortMode === option.key}
          onclick={() => onSortChange(option.key)}
        >{option.label}</button>
      {/each}
    </div>
  </div>

  {#if query.trim().length >= 2}
    <div class="dropdown" role="listbox">
      {#if searching}
        <div class="dropdown-msg">검색 중...</div>
      {:else if searchError}
        <div class="dropdown-msg dropdown-msg--error">{searchError}</div>
      {:else if searchResults.length === 0}
        <div class="dropdown-msg">결과 없음</div>
      {:else}
        {#each searchResults.slice(0, 8) as item}
          {@const inList = workspace.watchlist.some((entry) => entry.symbol === item.symbol && entry.market === item.market)}
          {@const label = displayLabel(item)}
          {@const showKrCompanyFirst = item.market === "krStock" && label !== item.symbol}
          <div class="dropdown-row" role="option" aria-selected="false">
            <button type="button" class="dropdown-select" onclick={() => select(item, label)}>
              {#if showKrCompanyFirst}
                <span class="sym sym--company">{label}</span>
                <span class="lbl lbl--code">{item.symbol} · {item.exchange}</span>
              {:else}
                <span class="sym">{item.symbol}</span>
                <span class="lbl">{label} · {item.exchange}</span>
              {/if}
            </button>
            <button
              type="button"
              class="add-btn"
              class:added={inList}
              title={inList ? "관심종목에 있음" : "관심종목 추가"}
              onclick={() => !inList && addItem(item, label)}
              aria-label={inList ? "이미 추가됨" : `${label} 관심종목 추가`}
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
</div>

<style>
  .search {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .search-field {
    position: relative;
    width: 100%;
  }

  .search-icon {
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    min-width: 0;
    height: 42px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 38px 0 34px;
    font: inherit;
    font-size: var(--fs-sm);
    background: color-mix(in srgb, var(--muted-bg) 68%, var(--card));
    color: var(--text);
    outline: none;
    transition: border-color var(--dur-fast) var(--ease);
  }

  .search-input:focus {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    background: var(--card);
  }
  .search-input::placeholder { color: var(--muted); }
  .search-input::-webkit-search-cancel-button { display: none; }

  .spin {
    position: absolute;
    top: 50%;
    right: 11px;
    width: 14px;
    height: 14px;
    transform: translateY(-50%);
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 2px;
    min-width: 0;
  }

  .segments {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }

  .segments--sort {
    flex-shrink: 0;
  }

  .segment-btn {
    height: 26px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-2xs);
    cursor: pointer;
    white-space: nowrap;
  }

  .segment-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 5%, transparent);
  }

  .segment-btn.active {
    border-color: transparent;
    background: color-mix(in srgb, var(--muted-bg) 92%, var(--border));
    color: var(--foreground);
    font-weight: 700;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 30;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .dropdown-msg {
    padding: 10px 12px;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .dropdown-msg--error { color: var(--danger); }

  .dropdown-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--line-soft);
  }

  .dropdown-row:last-child { border-bottom: none; }

  .dropdown-select {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    border: none;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }

  .dropdown-select:hover { background: color-mix(in srgb, var(--text) 5%, transparent); }

  .sym {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fs-sm);
    font-weight: 600;
  }

  .lbl {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .sym--company {
    font-size: var(--fs-base);
    font-weight: 700;
  }

  .lbl--code {
    font-size: var(--fs-2xs);
    font-variant-numeric: tabular-nums;
  }

  .add-btn {
    width: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-left: 1px solid var(--line-soft);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .add-btn:hover { color: var(--accent); background: var(--accent-soft); }
  .add-btn.added { color: var(--success); cursor: default; }

  @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
</style>
