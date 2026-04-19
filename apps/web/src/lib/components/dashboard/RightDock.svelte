<script lang="ts">
  import WatchlistPanel from "$lib/components/WatchlistPanel.svelte";
  import StrategyPanel from "$lib/components/dashboard/StrategyPanel.svelte";
  import FundamentalsPanel from "$lib/components/dashboard/FundamentalsPanel.svelte";
  import ChartSettingsPanel from "$lib/components/dashboard/ChartSettingsPanel.svelte";
  import type { DockTab } from "$lib/stores/workspace.svelte";
  import type { AnalysisParams, MarketType } from "$lib/api/types";

  let {
    activeTab,
    params,
    selectedSymbol,
    selectedMarket,
    interval,
    onTabChange,
    onClose,
    onSelectSymbol,
    onParamsChange,
    onOpenSettings,
  }: {
    activeTab: DockTab;
    params: AnalysisParams;
    selectedSymbol: string;
    selectedMarket: MarketType;
    interval: string;
    onTabChange: (tab: DockTab) => void;
    onClose?: () => void;
    onSelectSymbol: (symbol: string, market: MarketType, label?: string) => void;
    onParamsChange: (next: AnalysisParams) => void;
    onOpenSettings?: () => void;
  } = $props();

  const tabs: { key: DockTab; label: string }[] = [
    { key: "watchlist",    label: "관심종목" },
    { key: "strategy",     label: "전략" },
    { key: "fundamentals", label: "펀더멘털" },
    { key: "settings",     label: "설정" },
  ];

  const headerInfo = $derived(
    activeTab === "watchlist"
      ? { title: "관심종목",    subtitle: "실시간 종목 흐름과 즐겨찾기" }
    : activeTab === "strategy"
      ? { title: "전략 시그널", subtitle: "복합 전략 활성화 및 관리" }
    : activeTab === "fundamentals"
      ? { title: "펀더멘털",    subtitle: "재무지표 및 밸류에이션" }
    : { title: "설정",          subtitle: "차트 타입 · 스케일 · 테마" },
  );
</script>

<aside class="dock">
  <div class="dock__header">
    <div class="dock__header-copy">
      <div class="dock__title">{headerInfo.title}</div>
      <div class="dock__subtitle">{headerInfo.subtitle}</div>
    </div>
    {#if onClose}
      <button type="button" class="close-btn" onclick={onClose} aria-label="패널 닫기">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  <div class="dock__tabs" role="tablist">
    {#each tabs as tab}
      <button
        type="button"
        role="tab"
        class="tab-btn"
        class:active={activeTab === tab.key}
        aria-selected={activeTab === tab.key}
        onclick={() => onTabChange(tab.key)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

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
    {:else if activeTab === "strategy"}
      <StrategyPanel {params} onParamsChange={onParamsChange} />
    {:else if activeTab === "fundamentals"}
      {#key selectedSymbol}
        <FundamentalsPanel symbol={selectedSymbol} market={selectedMarket} />
      {/key}
    {:else if activeTab === "settings"}
      <ChartSettingsPanel {onOpenSettings} />
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

  .dock__header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    padding: 22px 24px 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
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

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: var(--muted-bg);
    color: var(--muted-fore);
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .close-btn:hover {
    border-color: var(--border);
    background: var(--muted-bg);
    color: var(--foreground);
  }

  .dock__tabs {
    display: flex;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .dock__tabs::-webkit-scrollbar { display: none; }

  .tab-btn {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted-fore);
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .tab-btn:hover {
    color: var(--foreground);
    background: var(--muted-bg);
  }

  .tab-btn.active {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary);
    font-weight: 700;
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
