<script lang="ts">
  import WatchlistPanel from "$lib/components/WatchlistPanel.svelte";
  import WatchlistSearch from "$lib/components/dashboard/WatchlistSearch.svelte";
  import ChartSettingsPanel from "$lib/components/dashboard/ChartSettingsPanel.svelte";
  import type { DockTab } from "$lib/stores/workspace.svelte";
  import type { MarketType } from "$lib/api/types";
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

</script>

<aside class="dock dock--{variant}">
  {#if activeTab === "watchlist"}
    <div class="dock__header dock__header--search">
      <WatchlistSearch onSelect={onSelectSymbol} />
    </div>
  {:else}
    <div class="dock__header">
      <div class="dock__header-copy">
        <div class="dock__title">설정</div>
        <div class="dock__subtitle">차트 타입 · 스케일 · 테마</div>
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
    border: 1px solid var(--border);
    border-radius: 8px;
    background:
      linear-gradient(180deg,
        color-mix(in srgb, var(--card) 97%, var(--muted-bg)) 0%,
        var(--card) 100%);
    box-shadow: var(--shadow-md);
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
    padding: 22px 24px 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .dock__header--search {
    display: block;
    padding: 12px 10px;
  }

  .dock__title {
    font-size: var(--fs-xl);
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
