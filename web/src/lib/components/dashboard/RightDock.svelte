<script lang="ts">
  import WatchlistPanel from "$lib/components/WatchlistPanel.svelte";
  import WatchlistSearch from "$lib/components/dashboard/WatchlistSearch.svelte";
  import ChartSettingsPanel from "$lib/components/dashboard/ChartSettingsPanel.svelte";
  import type { DockTab } from "$lib/stores/workspace.svelte";
  import type { MarketType } from "$lib/api/types";
  import type { SortMode } from "$lib/utils/presets";
  import type { FilterKey } from "$lib/features/watchlist/panelState";
  import type {
    DashboardSettingsActions,
    DashboardSettingsState,
  } from "$lib/features/dashboard/useDashboardPage.svelte";

  let {
    activeTab,
    selectedSymbol,
    selectedMarket,
    interval,
    settingsState,
    settingsActions,
    variant = "dock",
    onSelectSymbol,
    onOpenSettings,
  }: {
    activeTab: DockTab;
    selectedSymbol: string;
    selectedMarket: MarketType;
    interval: string;
    settingsState: DashboardSettingsState;
    settingsActions: DashboardSettingsActions;
    variant?: "dock" | "sheet";
    onSelectSymbol: (symbol: string, market: MarketType, label?: string) => void;
    onOpenSettings?: () => void;
  } = $props();

  let filter = $state<FilterKey>("all");
  let sortMode = $state<SortMode>("name");
</script>

<aside class="dock dock--{variant}">
  {#if activeTab === "watchlist"}
    <div class="dock__header dock__header--search">
      <WatchlistSearch
        {filter}
        {sortMode}
        onSelect={onSelectSymbol}
        onFilterChange={(next) => (filter = next)}
        onSortChange={(next) => (sortMode = next)}
      />
    </div>
  {:else}
    <div class="dock__header">
      <div class="dock__header-copy">
        <div class="dock__title">설정</div>
        <div class="dock__subtitle">차트 타입 · 스케일</div>
      </div>
    </div>
  {/if}

  <div class="dock__body">
    {#if activeTab === "watchlist"}
      {#key interval}
        <WatchlistPanel
          {selectedSymbol}
          {selectedMarket}
          {interval}
          {filter}
          {sortMode}
          onSelect={onSelectSymbol}
        />
      {/key}
    {:else if activeTab === "settings"}
      <ChartSettingsPanel {settingsState} {settingsActions} {onOpenSettings} />
    {/if}
  </div>
</aside>

<style>
  .dock {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    border: 0;
    background: var(--card);
    box-shadow: none;
    overflow: hidden;
  }

  .dock--sheet {
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.22);
  }

  .dock__header {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: start;
    padding: 28px 26px 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .dock__header--search {
    display: block;
    padding: 18px 18px 16px;
  }

  .dock__title {
    font-size: var(--fs-2xl);
    font-weight: 800;
    color: var(--foreground);
  }

  .dock__subtitle {
    font-size: var(--fs-sm);
    color: var(--muted-fore);
    margin-top: 6px;
    line-height: 1.45;
  }

  .dock__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
